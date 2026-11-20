import { priceChangePayload } from '@abonnements/core';
import { type Kysely, sql, type Transaction } from 'kysely';
import type { NewId } from '@/db/executor';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';
import { pendingPriceChange } from './pending-price-change';

/**
 * Trace le changement de prix : l'écart constaté au rapprochement devient appliqué (son `from` est le prix
 * que l'abonnement quitte) ; sans écart en attente, un nouvel événement est créé.
 */
async function recordAppliedChange(
  trx: Transaction<DB>,
  subscriptionId: string,
  amounts: { from: number; to: number },
  today: string,
  newId: NewId,
): Promise<void> {
  const events = await trx
    .selectFrom('event')
    .select(['id', 'payload'])
    .where('subscription_id', '=', subscriptionId)
    .where('type', '=', 'price_change')
    .orderBy('occurred_on', 'desc')
    .orderBy('created_at', 'desc')
    .orderBy(sql`rowid`, 'desc')
    .execute();
  const pending = pendingPriceChange(events, amounts.to);
  if (pending) {
    const payload = JSON.stringify({ ...pending.payload, from: amounts.from, applied: true });
    await trx.updateTable('event').set({ payload }).where('id', '=', pending.id).execute();
    return;
  }
  await trx
    .insertInto('event')
    .values({
      id: newId(),
      subscription_id: subscriptionId,
      type: 'price_change',
      occurred_on: today,
      payload: JSON.stringify(priceChangePayload(amounts.from, amounts.to, 'reconciliation', true)),
    })
    .execute();
}

/** Montant constaté au rapprochement, reporté sur l'abonnement à la demande de l'utilisateur. */
export async function updateSubscriptionAmount(
  db: Kysely<DB>,
  subscriptionId: string,
  amountCents: number,
  today: string,
  newId: NewId,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const row = await trx.selectFrom('subscription').select('amount_cents').where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    if (row.amount_cents !== amountCents) {
      await recordAppliedChange(trx, subscriptionId, { from: row.amount_cents, to: amountCents }, today, newId);
    }
    await trx.updateTable('subscription').set({ amount_cents: amountCents }).where('id', '=', subscriptionId).execute();
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
