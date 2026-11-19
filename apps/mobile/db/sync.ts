import type { Kysely, Transaction } from 'kysely';
import {
  compareDates,
  generateCharges,
  groupTransfers,
  planRegeneration,
  type SubscriptionSnapshot,
} from '@abonnements/core';
import type { DB, Subscription } from './types';

export type NewId = () => string;

type Executor = Kysely<DB> | Transaction<DB>;

export function toSnapshot(row: Subscription): SubscriptionSnapshot {
  return {
    id: row.id,
    status: row.status,
    paymentMethod: row.payment_method,
    amountCents: row.amount_cents,
    periodUnit: row.period_unit,
    periodCount: row.period_count,
    anchorDay: row.anchor_day,
    nextChargeDate: row.next_charge_date,
    trialEndDate: row.trial_end_date,
    postTrialAmountCents: row.post_trial_amount_cents,
    periodEndDate: row.period_end_date,
    marginOverrideBp: row.margin_override_bp,
    archived: row.archived_at !== null,
  };
}

export async function syncSubscriptionCharges(trx: Executor, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  const settings = await trx.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
  const stored = await trx.selectFrom('charge').selectAll().where('subscription_id', '=', subscriptionId).execute();

  const expected = generateCharges(toSnapshot(row), { today, globalMarginBp: settings.global_margin_bp });
  const plan = planRegeneration(
    subscriptionId,
    stored.map((c) => ({
      id: c.id,
      subscriptionId: c.subscription_id,
      dueDate: c.due_date,
      provisionOnly: c.provision_only === 1,
      status: c.status,
      expectedAmountCents: c.expected_amount_cents,
      fundedAmountCents: c.funded_amount_cents,
      isTrialConversion: c.is_trial_conversion === 1,
    })),
    expected,
  );

  for (const charge of plan.create) {
    await trx
      .insertInto('charge')
      .values({
        id: newId(),
        subscription_id: charge.subscriptionId,
        due_date: charge.dueDate,
        expected_amount_cents: charge.expectedAmountCents,
        funded_amount_cents: charge.fundedAmountCents,
        status: charge.status,
        is_trial_conversion: charge.isTrialConversion ? 1 : 0,
      })
      .execute();
  }
  for (const update of plan.update) {
    await trx
      .updateTable('charge')
      .set({
        expected_amount_cents: update.expectedAmountCents,
        funded_amount_cents: update.fundedAmountCents,
        status: update.status,
        is_trial_conversion: update.isTrialConversion ? 1 : 0,
      })
      .where('id', '=', update.id)
      .execute();
  }
  if (plan.remove.length > 0) {
    await trx.deleteFrom('charge').where('id', 'in', plan.remove).execute();
  }
  if (plan.skip.length > 0) {
    await trx.updateTable('charge').set({ status: 'skipped' }).where('id', 'in', plan.skip).execute();
  }
}

export async function syncTransfers(trx: Executor, newId: NewId): Promise<void> {
  const settings = await trx.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const charges = await trx
    .selectFrom('charge')
    .select(['id', 'due_date', 'funded_amount_cents', 'status'])
    .where('status', '=', 'planned')
    .where('provision_only', '=', 0)
    .execute();
  const groups = groupTransfers(
    charges.map((c) => ({ id: c.id, dueDate: c.due_date, fundedAmountCents: c.funded_amount_cents, status: c.status })),
    settings.funding_lead_days,
  );

  const planned = await trx
    .selectFrom('transfer')
    .selectAll()
    .where('type', '=', 'vault_to_main')
    .where('status', '=', 'planned')
    .execute();
  const byDate = new Map(planned.map((t) => [t.planned_date, t]));

  if (planned.length > 0) {
    await trx.deleteFrom('transfer_charge').where('transfer_id', 'in', planned.map((t) => t.id)).execute();
  }

  const kept = new Set<string>();
  for (const group of groups) {
    const firstDue = group.charges.map((c) => c.dueDate).sort(compareDates)[0] ?? group.plannedDate;
    const existing = byDate.get(group.plannedDate);
    let transferId: string;
    if (existing) {
      transferId = existing.id;
      const rescheduled =
        existing.rescheduled_date && compareDates(existing.rescheduled_date, firstDue) <= 0 ? existing.rescheduled_date : null;
      await trx
        .updateTable('transfer')
        .set({ amount_cents: group.amountCents, rescheduled_date: rescheduled })
        .where('id', '=', transferId)
        .execute();
    } else {
      transferId = newId();
      await trx
        .insertInto('transfer')
        .values({ id: transferId, type: 'vault_to_main', planned_date: group.plannedDate, amount_cents: group.amountCents })
        .execute();
    }
    kept.add(transferId);
    await trx
      .insertInto('transfer_charge')
      .values(group.charges.map((c) => ({ transfer_id: transferId, charge_id: c.id, amount_cents: c.fundedAmountCents })))
      .execute();
  }

  const obsolete = planned.filter((t) => !kept.has(t.id)).map((t) => t.id);
  if (obsolete.length > 0) {
    await trx.deleteFrom('transfer').where('id', 'in', obsolete).execute();
  }
}

export async function resyncAll(trx: Executor, today: string, newId: NewId): Promise<void> {
  const subs = await trx.selectFrom('subscription').select('id').execute();
  for (const { id } of subs) {
    await syncSubscriptionCharges(trx, id, today, newId);
  }
  await syncTransfers(trx, newId);
}
