import type { LifecycleAction, PaydayPeriod } from '@abonnements/core';
import type { Kysely, Transaction } from 'kysely';
import { applyTransition } from './reconcile';
import { computePayday } from './repositories/plan';
import { correctionsRepository, type NewSubscriptionInput, type SubscriptionEdit, subscriptionsRepository } from './repositories/subscriptions';
import { type NewId, syncSubscriptionCharges, syncTransfers } from './sync';
import type { DB } from './types';

async function resync(trx: Transaction<DB>, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await syncSubscriptionCharges(trx, subscriptionId, today, newId);
  await syncTransfers(trx, newId);
}

export async function createSubscription(
  db: Kysely<DB>,
  input: NewSubscriptionInput,
  today: string,
  newId: NewId,
  options: EditOptions = {},
): Promise<string> {
  const id = newId();
  await db.transaction().execute(async (trx) => {
    await subscriptionsRepository(trx).insert(id, input);
    if (options.correction) {
      await correctionsRepository(trx).save(input.name, options.correction.categoryId, options.correction.iconKey);
    }
    await trx
      .insertInto('event')
      .values({
        id: newId(),
        subscription_id: id,
        type: 'status_change',
        occurred_on: today,
        payload: JSON.stringify({ from: null, to: input.status }),
      })
      .execute();
    await resync(trx, id, today, newId);
  });
  return id;
}

export async function transitionSubscription(
  db: Kysely<DB>,
  subscriptionId: string,
  action: LifecycleAction,
  today: string,
  newId: NewId,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await applyTransition(trx, subscriptionId, action, today, newId);
    await resync(trx, subscriptionId, today, newId);
  });
}

export interface EditOptions {
  correction?: { categoryId: string; iconKey: string } | null;
}

export async function updateSubscription(
  db: Kysely<DB>,
  subscriptionId: string,
  edit: SubscriptionEdit,
  today: string,
  newId: NewId,
  options: EditOptions = {},
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    await subscriptionsRepository(trx).update(row, edit);
    if (row.amount_cents !== edit.amountCents && row.status !== 'trial') {
      await trx
        .insertInto('event')
        .values({
          id: newId(),
          subscription_id: subscriptionId,
          type: 'price_change',
          occurred_on: today,
          payload: JSON.stringify({ from: row.amount_cents, to: edit.amountCents }),
        })
        .execute();
    }
    if (options.correction) {
      await correctionsRepository(trx).save(edit.name, options.correction.categoryId, options.correction.iconKey);
    }
    await resync(trx, subscriptionId, today, newId);
  });
}

export async function fundedFutureCharges(db: Kysely<DB>, subscriptionId: string, today: string) {
  return db
    .selectFrom('charge')
    .select(['due_date', 'funded_amount_cents'])
    .where('subscription_id', '=', subscriptionId)
    .where('status', '=', 'funded')
    .where('provision_only', '=', 0)
    .where('due_date', '>=', today)
    .orderBy('due_date')
    .execute();
}

export async function archiveSubscription(db: Kysely<DB>, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('subscription')
      .set({ archived_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') })
      .where('id', '=', subscriptionId)
      .execute();
    await resync(trx, subscriptionId, today, newId);
  });
}

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

async function linkedChargeIds(trx: Transaction<DB>, transferId: string): Promise<string[]> {
  const links = await trx.selectFrom('transfer_charge').select('charge_id').where('transfer_id', '=', transferId).execute();
  return links.map((l) => l.charge_id);
}

export async function markTransferDone(db: Kysely<DB>, transferId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('transfer').set({ status: 'done', done_at: nowIso() }).where('id', '=', transferId).execute();
    const ids = await linkedChargeIds(trx, transferId);
    if (ids.length > 0) {
      await trx.updateTable('charge').set({ status: 'funded' }).where('id', 'in', ids).where('status', '=', 'planned').execute();
    }
  });
}

export async function undoTransferDone(db: Kysely<DB>, transferId: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const ids = await linkedChargeIds(trx, transferId);
    await trx.updateTable('transfer').set({ status: 'planned', done_at: null }).where('id', '=', transferId).execute();
    if (ids.length > 0) {
      await trx.updateTable('charge').set({ status: 'planned' }).where('id', 'in', ids).where('status', '=', 'funded').execute();
    }
    await syncTransfers(trx, newId);
  });
}

export async function rescheduleTransfer(db: Kysely<DB>, transferId: string, date: string | null): Promise<void> {
  await db.updateTable('transfer').set({ rescheduled_date: date }).where('id', '=', transferId).where('status', '=', 'planned').execute();
}

export async function markPaydayDone(db: Kysely<DB>, period: PaydayPeriod, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('transfer')
      .select('id')
      .where('type', '=', 'payday')
      .where('planned_date', '=', period.start)
      .executeTakeFirst();
    if (existing) {
      return;
    }
    const { totalCents, lines } = await computePayday(trx, period);
    const transferId = newId();
    await trx
      .insertInto('transfer')
      .values({ id: transferId, type: 'payday', planned_date: period.start, amount_cents: totalCents, status: 'done', done_at: nowIso() })
      .execute();
    for (const line of lines) {
      if (line.kind !== 'provision' || !line.subscriptionId || line.amountCents <= 0) {
        continue;
      }
      const chargeId = newId();
      await trx
        .insertInto('charge')
        .values({
          id: chargeId,
          subscription_id: line.subscriptionId,
          due_date: period.start,
          expected_amount_cents: line.amountCents,
          funded_amount_cents: line.amountCents,
          status: 'funded',
          provision_only: 1,
        })
        .execute();
      await trx.insertInto('transfer_charge').values({ transfer_id: transferId, charge_id: chargeId, amount_cents: line.amountCents }).execute();
    }
  });
}

export async function undoPayday(db: Kysely<DB>, transferId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const ids = await linkedChargeIds(trx, transferId);
    await trx.deleteFrom('transfer').where('id', '=', transferId).where('type', '=', 'payday').execute();
    if (ids.length > 0) {
      await trx.deleteFrom('charge').where('id', 'in', ids).where('provision_only', '=', 1).execute();
    }
  });
}

export async function returnResidual(db: Kysely<DB>, amountCents: number, today: string, newId: NewId): Promise<void> {
  await db
    .insertInto('transfer')
    .values({ id: newId(), type: 'residual_return', planned_date: today, amount_cents: amountCents, status: 'done', done_at: nowIso() })
    .execute();
}
