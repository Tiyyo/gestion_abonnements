import { compareDates } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';
import { applyTransition } from './apply-transition';

export async function confirmCancellation(db: Kysely<DB>, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await applyTransition(trx, subscriptionId, { type: 'confirm_cancel_done' }, today, newId);
    const row = await trx.selectFrom('subscription').select('period_end_date').where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    if (row.period_end_date && compareDates(row.period_end_date, today) < 0) {
      await applyTransition(trx, subscriptionId, { type: 'finalize_cancel' }, today, newId);
    }
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
