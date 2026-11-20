import { markFailed, markPaid } from '@abonnements/core';
import type { Kysely, Transaction } from 'kysely';
import type { NewId } from '@/db/executor';
import { resyncSubscription } from '@/db/sync/resync';
import { syncTransfers } from '@/db/sync/sync-transfers';
import type { Charge, DB, Subscription } from '@/db/types';
import { applyTransition } from './apply-transition';
import { insertEvents } from './insert-events';
import { RETRY_NOTE } from './retry-note';
import { relabelAfterCancel, toReconcilable } from './review-mapping';

export type ReviewAnswer =
  { kind: 'paid'; amountCents: number; date: string } | { kind: 'failed'; choice: 'merchant_will_retry' | 'give_up' };

export interface ReviewResult {
  proposeAmountUpdate: boolean;
  trialDecision: boolean;
  subscriptionId: string;
}

interface ReviewContext {
  trx: Transaction<DB>;
  charge: Charge;
  sub: Subscription;
  today: string;
  newId: NewId;
}

async function recordPaid({ trx, charge, sub, newId }: ReviewContext, answer: Extract<ReviewAnswer, { kind: 'paid' }>): Promise<boolean> {
  const outcome = markPaid(toReconcilable(charge), answer.amountCents, answer.date);
  await trx
    .updateTable('charge')
    .set({ status: 'paid', actual_amount_cents: outcome.actualAmountCents, actual_date: outcome.actualDate })
    .where('id', '=', charge.id)
    .execute();
  await insertEvents(trx, relabelAfterCancel(outcome.events, sub.status), newId);
  return outcome.proposeAmountUpdate && sub.status !== 'cancelled';
}

/** Prélèvement non voulu qui a échoué : si c'était la conversion d'un essai, l'essai est annulé. */
async function recordUnfundedFailure({ trx, charge, sub, today, newId }: ReviewContext, trialConversion: boolean): Promise<void> {
  await trx.updateTable('charge').set({ status: 'failed' }).where('id', '=', charge.id).execute();
  if (trialConversion) {
    await insertEvents(
      trx,
      [{ type: 'charge_failed', subscriptionId: sub.id, occurredOn: today, amountCents: null, payload: { chargeId: charge.id } }],
      newId,
    );
    await applyTransition(trx, sub.id, { type: 'cancel_trial' }, today, newId);
    await resyncSubscription(trx, sub.id, today, newId);
  }
}

async function recordFailure(
  { trx, charge, sub, today, newId }: ReviewContext,
  choice: Extract<ReviewAnswer, { kind: 'failed' }>['choice'],
): Promise<void> {
  const outcome = markFailed(toReconcilable(charge), { kind: choice }, today);
  if (outcome.reviewAgainOn) {
    await trx
      .insertInto('event')
      .values({
        id: newId(),
        subscription_id: sub.id,
        type: 'note',
        occurred_on: today,
        payload: JSON.stringify({ kind: RETRY_NOTE, chargeId: charge.id, reviewAgainOn: outcome.reviewAgainOn }),
      })
      .execute();
  } else {
    await trx.updateTable('charge').set({ status: outcome.status }).where('id', '=', charge.id).execute();
    await insertEvents(trx, outcome.events, newId);
    await syncTransfers(trx, newId);
  }
}

/** Rapprochement dans une transaction déjà ouverte (le rapprochement automatique en applique plusieurs d'un coup). */
export async function reviewChargeIn(
  trx: Transaction<DB>,
  chargeId: string,
  answer: ReviewAnswer,
  today: string,
  newId: NewId,
): Promise<ReviewResult> {
  const charge = await trx.selectFrom('charge').selectAll().where('id', '=', chargeId).executeTakeFirstOrThrow();
  const sub = await trx.selectFrom('subscription').selectAll().where('id', '=', charge.subscription_id).executeTakeFirstOrThrow();
  const context: ReviewContext = { trx, charge, sub, today, newId };
  const trialConversion = charge.is_trial_conversion === 1 && sub.status === 'trial';
  const result: ReviewResult = { proposeAmountUpdate: false, trialDecision: false, subscriptionId: sub.id };

  if (answer.kind === 'paid') {
    result.proposeAmountUpdate = await recordPaid(context, answer);
    result.trialDecision = trialConversion;
  } else if (charge.status === 'unfunded') {
    await recordUnfundedFailure(context, trialConversion);
  } else {
    await recordFailure(context, answer.choice);
  }
  return result;
}

/**
 * Réponse de l'utilisateur. `bankTransactionId` : le débit de la banque qu'il vient de reconnaître dans ce
 * prélèvement (carte « Débit non prévu »), rattaché dans la même transaction pour ne plus être signalé.
 */
export async function reviewCharge(
  db: Kysely<DB>,
  chargeId: string,
  answer: ReviewAnswer,
  today: string,
  newId: NewId,
  bankTransactionId?: string,
): Promise<ReviewResult> {
  return db.transaction().execute(async (trx) => {
    const result = await reviewChargeIn(trx, chargeId, answer, today, newId);
    if (bankTransactionId && answer.kind === 'paid') {
      await trx
        .updateTable('bank_transaction')
        .set({ outcome: 'applied', charge_id: chargeId })
        .where('id', '=', bankTransactionId)
        .execute();
    }
    return result;
  });
}
