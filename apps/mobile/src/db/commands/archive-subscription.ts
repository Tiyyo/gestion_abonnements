import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { nowIso } from '@/db/now-iso';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';

export async function archiveSubscription(db: Kysely<DB>, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('subscription').set({ archived_at: nowIso() }).where('id', '=', subscriptionId).execute();
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
