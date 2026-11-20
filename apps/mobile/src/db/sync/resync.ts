import type { Executor, NewId } from '@/db/executor';
import { syncSubscriptionCharges } from './sync-subscription-charges';
import { syncTransfers } from './sync-transfers';

/** Régénère les prélèvements d'un abonnement puis tout le plan de transferts. */
export async function resyncSubscription(trx: Executor, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await syncSubscriptionCharges(trx, subscriptionId, today, newId);
  await syncTransfers(trx, newId);
}

export async function resyncAll(trx: Executor, today: string, newId: NewId): Promise<void> {
  const subs = await trx.selectFrom('subscription').select('id').execute();
  for (const { id } of subs) {
    await syncSubscriptionCharges(trx, id, today, newId);
  }
  await syncTransfers(trx, newId);
}
