import type { Kysely } from 'kysely';
import { nowIso } from '@/db/now-iso';
import type { DB } from '@/db/types';
import { linkedChargeIds } from './linked-charge-ids';

export async function markTransferDone(db: Kysely<DB>, transferId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('transfer').set({ status: 'done', done_at: nowIso() }).where('id', '=', transferId).execute();
    const ids = await linkedChargeIds(trx, transferId);
    if (ids.length > 0) {
      await trx.updateTable('charge').set({ status: 'funded' }).where('id', 'in', ids).where('status', '=', 'planned').execute();
    }
  });
}
