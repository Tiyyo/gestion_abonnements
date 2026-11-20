import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import { linkedChargeIds } from './linked-charge-ids';

export async function undoPayday(db: Kysely<DB>, transferId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const ids = await linkedChargeIds(trx, transferId);
    await trx.deleteFrom('transfer').where('id', '=', transferId).where('type', '=', 'payday').execute();
    if (ids.length > 0) {
      await trx.deleteFrom('charge').where('id', 'in', ids).where('provision_only', '=', 1).execute();
    }
  });
}
