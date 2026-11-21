import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import { bankHintFor, loadBankContext } from './bank-transactions';

/** Prélèvements à venir déjà financés d'un abonnement (prévenir avant de modifier son échéancier). */
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

/** Prélèvement à rapprocher, avec le nom et l'état de son abonnement et ce qu'en dit la banque (null s'il n'existe plus). */
export async function chargeToReview(db: Kysely<DB>, chargeId: string) {
  const row = await db
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .selectAll('charge')
    .select(['subscription.name', 'subscription.status as subscription_status'])
    .where('charge.id', '=', chargeId)
    .executeTakeFirst();
  return row ? { ...row, bankHint: bankHintFor(await loadBankContext(db), row) } : null;
}
