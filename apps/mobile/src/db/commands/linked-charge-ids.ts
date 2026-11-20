import type { Transaction } from 'kysely';
import type { DB } from '@/db/types';

export async function linkedChargeIds(trx: Transaction<DB>, transferId: string): Promise<string[]> {
  const links = await trx.selectFrom('transfer_charge').select('charge_id').where('transfer_id', '=', transferId).execute();
  return links.map((l) => l.charge_id);
}
