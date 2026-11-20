import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { syncTransfers } from '@/db/sync/sync-transfers';
import type { DB } from '@/db/types';
import { linkedChargeIds } from './linked-charge-ids';

export async function undoTransferDone(db: Kysely<DB>, transferId: string, newId: NewId): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const ids = await linkedChargeIds(trx, transferId);
    await trx.updateTable('transfer').set({ status: 'planned', done_at: null }).where('id', '=', transferId).execute();
    if (ids.length > 0) {
      await trx.updateTable('charge').set({ status: 'planned' }).where('id', 'in', ids).where('status', '=', 'funded').execute();
    }
    await syncTransfers(trx, newId);
  });
}
