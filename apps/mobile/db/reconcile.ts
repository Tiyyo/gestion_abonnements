import {
  classifyUnknownDebit,
  compareDates,
  markFailed,
  markPaid,
  type NewEvent,
  nthDueDate,
  suggestedPeriodEnd,
  transition,
  type UnknownDebit,
} from '@abonnements/core';
import type { Kysely, Transaction } from 'kysely';
import { type NewId, syncSubscriptionCharges, syncTransfers, toSnapshot } from './sync';
import type { DB } from './types';

export const RETRY_NOTE = 'review_again';

export type ReviewAnswer =
  | { kind: 'paid'; amountCents: number; date: string }
  | { kind: 'failed'; choice: 'merchant_will_retry' | 'give_up' };

export interface ReviewResult {
  proposeAmountUpdate: boolean;
  trialDecision: boolean;
  subscriptionId: string;
}

async function insertEvents(trx: Transaction<DB>, events: readonly NewEvent[], newId: NewId): Promise<void> {
  for (const e of events) {
    await trx
      .insertInto('event')
      .values({
        id: newId(),
        subscription_id: e.subscriptionId,
        type: e.type,
        occurred_on: e.occurredOn,
        amount_cents: e.amountCents,
        payload: JSON.stringify(e.payload),
      })
      .execute();
  }
}

export async function applyTransition(
  trx: Transaction<DB>,
  subscriptionId: string,
  action: Parameters<typeof transition>[1],
  today: string,
  newId: NewId,
  patch: { nextChargeDate?: string } = {},
): Promise<void> {
  const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
  const { state, statusChange } = transition({ ...toSnapshot(row), cancelDone: row.cancel_done === 1 }, action, today);
  const nextChargeDate = patch.nextChargeDate ?? state.nextChargeDate;
  await trx
    .updateTable('subscription')
    .set({
      status: state.status,
      amount_cents: state.amountCents,
      next_charge_date: nextChargeDate,
      anchor_day: nextChargeDate === row.next_charge_date || state.periodUnit === 'week' ? row.anchor_day : Number(nextChargeDate.slice(8, 10)),
      trial_end_date: state.trialEndDate,
      post_trial_amount_cents: state.postTrialAmountCents,
      period_end_date: state.periodEndDate,
      cancel_done: state.cancelDone ? 1 : 0,
    })
    .where('id', '=', subscriptionId)
    .execute();
  if (statusChange) {
    await trx
      .insertInto('event')
      .values({ id: newId(), subscription_id: subscriptionId, type: 'status_change', occurred_on: today, payload: JSON.stringify(statusChange) })
      .execute();
  }
}

async function resync(trx: Transaction<DB>, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await syncSubscriptionCharges(trx, subscriptionId, today, newId);
  await syncTransfers(trx, newId);
}

export async function reviewCharge(db: Kysely<DB>, chargeId: string, answer: ReviewAnswer, today: string, newId: NewId): Promise<ReviewResult> {
  return db.transaction().execute(async (trx) => {
    const charge = await trx.selectFrom('charge').selectAll().where('id', '=', chargeId).executeTakeFirstOrThrow();
    const sub = await trx.selectFrom('subscription').selectAll().where('id', '=', charge.subscription_id).executeTakeFirstOrThrow();
    const reconcilable = {
      id: charge.id,
      subscriptionId: charge.subscription_id,
      dueDate: charge.due_date,
      status: charge.status,
      expectedAmountCents: charge.expected_amount_cents,
      fundedAmountCents: charge.funded_amount_cents,
    };
    const trialConversion = charge.is_trial_conversion === 1 && sub.status === 'trial';
    const result: ReviewResult = { proposeAmountUpdate: false, trialDecision: false, subscriptionId: sub.id };

    if (answer.kind === 'paid') {
      const outcome = markPaid(reconcilable, answer.amountCents, answer.date);
      await trx
        .updateTable('charge')
        .set({ status: 'paid', actual_amount_cents: outcome.actualAmountCents, actual_date: outcome.actualDate })
        .where('id', '=', chargeId)
        .execute();
      const events =
        sub.status === 'cancelled'
          ? outcome.events.map((e) => (e.type === 'unexpected_charge' ? { ...e, type: 'post_cancel_charge' as const } : e))
          : outcome.events;
      await insertEvents(trx, events, newId);
      result.proposeAmountUpdate = outcome.proposeAmountUpdate && sub.status !== 'cancelled';
      result.trialDecision = trialConversion;
      return result;
    }

    if (charge.status === 'unfunded') {
      await trx.updateTable('charge').set({ status: 'failed' }).where('id', '=', chargeId).execute();
      if (trialConversion) {
        await insertEvents(
          trx,
          [{ type: 'charge_failed', subscriptionId: sub.id, occurredOn: today, amountCents: null, payload: { chargeId } }],
          newId,
        );
        await applyTransition(trx, sub.id, { type: 'cancel_trial' }, today, newId);
        await resync(trx, sub.id, today, newId);
      }
      return result;
    }

    const outcome = markFailed(reconcilable, { kind: answer.choice }, today);
    if (outcome.reviewAgainOn) {
      await trx
        .insertInto('event')
        .values({
          id: newId(),
          subscription_id: sub.id,
          type: 'note',
          occurred_on: today,
          payload: JSON.stringify({ kind: RETRY_NOTE, chargeId, reviewAgainOn: outcome.reviewAgainOn }),
        })
        .execute();
    } else {
      await trx.updateTable('charge').set({ status: outcome.status }).where('id', '=', chargeId).execute();
      await insertEvents(trx, outcome.events, newId);
      await syncTransfers(trx, newId);
    }
    return result;
  });
}

export async function decideAfterPaidTrial(
  db: Kysely<DB>,
  subscriptionId: string,
  decision: 'keep' | 'cancel',
  today: string,
  newId: NewId,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    const snapshot = { ...toSnapshot(row), status: 'active' as const, nextChargeDate: row.trial_end_date ?? row.next_charge_date };
    let n = 1;
    while (compareDates(nthDueDate(snapshot, n), today) < 0) {
      n += 1;
    }
    const next = nthDueDate(snapshot, n);
    await applyTransition(trx, subscriptionId, { type: 'keep_trial' }, today, newId, { nextChargeDate: next });
    if (decision === 'cancel') {
      const end = suggestedPeriodEnd(next);
      await applyTransition(trx, subscriptionId, { type: 'stop', periodEndDate: compareDates(end, today) < 0 ? today : end }, today, newId);
    }
    await resync(trx, subscriptionId, today, newId);
  });
}

export async function confirmCancellation(db: Kysely<DB>, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await applyTransition(trx, subscriptionId, { type: 'confirm_cancel_done' }, today, newId);
    const row = await trx.selectFrom('subscription').select('period_end_date').where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    if (row.period_end_date && compareDates(row.period_end_date, today) < 0) {
      await applyTransition(trx, subscriptionId, { type: 'finalize_cancel' }, today, newId);
    }
    await resync(trx, subscriptionId, today, newId);
  });
}

export async function updateSubscriptionAmount(db: Kysely<DB>, subscriptionId: string, amountCents: number, today: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('subscription').set({ amount_cents: amountCents }).where('id', '=', subscriptionId).execute();
    await resync(trx, subscriptionId, today, newId);
  });
}

export async function runDailyMaintenance(db: Kysely<DB>, today: string, newId: NewId): Promise<number> {
  return db.transaction().execute(async (trx) => {
    let changed = 0;
    const toFinalize = await trx
      .selectFrom('subscription')
      .select('id')
      .where('status', '=', 'to_cancel')
      .where('cancel_done', '=', 1)
      .where('period_end_date', '<', today)
      .where('archived_at', 'is', null)
      .execute();
    for (const { id } of toFinalize) {
      await applyTransition(trx, id, { type: 'finalize_cancel' }, today, newId);
      await syncSubscriptionCharges(trx, id, today, newId);
      changed += 1;
    }

    const stale = await trx
      .selectFrom('subscription')
      .selectAll()
      .where('status', 'in', ['active', 'to_cancel'])
      .where('next_charge_date', '<', today)
      .where('archived_at', 'is', null)
      .execute();
    for (const row of stale) {
      const closed = new Set(
        (
          await trx
            .selectFrom('charge')
            .select('due_date')
            .where('subscription_id', '=', row.id)
            .where('provision_only', '=', 0)
            .where('status', 'in', ['paid', 'failed', 'skipped'])
            .execute()
        ).map((c) => c.due_date),
      );
      const snapshot = toSnapshot(row);
      let n = 0;
      while (compareDates(nthDueDate(snapshot, n), today) < 0 && closed.has(nthDueDate(snapshot, n))) {
        n += 1;
      }
      if (n > 0) {
        await trx.updateTable('subscription').set({ next_charge_date: nthDueDate(snapshot, n) }).where('id', '=', row.id).execute();
        await syncSubscriptionCharges(trx, row.id, today, newId);
        changed += 1;
      }
    }

    if (changed > 0) {
      await syncTransfers(trx, newId);
    }
    return changed;
  });
}

export function isPostponed(payloads: readonly string[], chargeId: string, today: string): boolean {
  return payloads.some((p) => {
    const note = JSON.parse(p) as { kind?: string; chargeId?: string; reviewAgainOn?: string };
    return note.kind === RETRY_NOTE && note.chargeId === chargeId && !!note.reviewAgainOn && compareDates(note.reviewAgainOn, today) > 0;
  });
}

export type DebitOutcome =
  | { kind: 'matches_charge'; chargeId: string; name: string; dueDate: string }
  | { kind: 'event'; type: NewEvent['type']; subscriptionId: string | null; offerCreateSubscription: boolean };

export async function classifyDebit(db: Kysely<DB>, debit: UnknownDebit): Promise<DebitOutcome> {
  const subs = await db.selectFrom('subscription').selectAll().where('archived_at', 'is', null).execute();
  const charges = await db.selectFrom('charge').selectAll().where('provision_only', '=', 0).execute();
  const result = classifyUnknownDebit(
    debit,
    subs.map((s) => ({ id: s.id, name: s.name, status: s.status, periodUnit: s.period_unit, periodCount: s.period_count })),
    charges.map((c) => ({
      id: c.id,
      subscriptionId: c.subscription_id,
      dueDate: c.due_date,
      status: c.status,
      expectedAmountCents: c.expected_amount_cents,
      fundedAmountCents: c.funded_amount_cents,
      actualDate: c.actual_date,
    })),
  );
  if (result.kind === 'matches_charge') {
    const charge = charges.find((c) => c.id === result.chargeId);
    const sub = subs.find((s) => s.id === charge?.subscription_id);
    return { kind: 'matches_charge', chargeId: result.chargeId, name: sub?.name ?? debit.name, dueDate: charge?.due_date ?? debit.date };
  }
  return { kind: 'event', type: result.event.type, subscriptionId: result.event.subscriptionId, offerCreateSubscription: result.offerCreateSubscription };
}

export async function recordUnknownDebit(db: Kysely<DB>, debit: UnknownDebit, outcome: Extract<DebitOutcome, { kind: 'event' }>, newId: NewId): Promise<void> {
  await db
    .insertInto('event')
    .values({
      id: newId(),
      subscription_id: outcome.subscriptionId,
      type: outcome.type,
      occurred_on: debit.date,
      amount_cents: debit.amountCents,
      payload: JSON.stringify({ name: debit.name.trim() }),
    })
    .execute();
}

export async function correctiveTransfer(db: Kysely<DB>, chargeId: string, newAmountCents: number, today: string, newId: NewId): Promise<number> {
  return db.transaction().execute(async (trx) => {
    const charge = await trx.selectFrom('charge').selectAll().where('id', '=', chargeId).executeTakeFirstOrThrow();
    const diff = newAmountCents - charge.funded_amount_cents;
    if (diff <= 0) {
      return 0;
    }
    const transferId = newId();
    await trx
      .insertInto('transfer')
      .values({
        id: transferId,
        type: 'vault_to_main',
        planned_date: today,
        amount_cents: diff,
        status: 'done',
        done_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      })
      .execute();
    await trx.insertInto('transfer_charge').values({ transfer_id: transferId, charge_id: chargeId, amount_cents: diff }).execute();
    await trx
      .updateTable('charge')
      .set({ expected_amount_cents: newAmountCents, funded_amount_cents: newAmountCents, status: 'funded' })
      .where('id', '=', chargeId)
      .execute();
    return diff;
  });
}
