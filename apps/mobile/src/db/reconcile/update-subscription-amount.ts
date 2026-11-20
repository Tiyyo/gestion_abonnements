import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';

/** Montant constaté au rapprochement, reporté sur l'abonnement à la demande de l'utilisateur. */
export async function updateSubscriptionAmount(
  db: Kysely<DB>,
  subscriptionId: string,
  amountCents: number,
  today: string,
  newId: NewId,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('subscription').set({ amount_cents: amountCents }).where('id', '=', subscriptionId).execute();
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
