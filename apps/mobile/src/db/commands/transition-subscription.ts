import type { LifecycleAction } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { applyTransition } from '@/db/reconcile/apply-transition';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';

export async function transitionSubscription(
  db: Kysely<DB>,
  subscriptionId: string,
  action: LifecycleAction,
  today: string,
  newId: NewId,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await applyTransition(trx, subscriptionId, action, today, newId);
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
