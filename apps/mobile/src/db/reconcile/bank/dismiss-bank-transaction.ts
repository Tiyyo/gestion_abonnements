import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';

/** « Ignorer » un débit non prévu : il n'est plus signalé et ne sera pas relu. Rien d'autre ne change. */
export async function dismissBankTransaction(db: Kysely<DB>, transactionId: string): Promise<void> {
  await db
    .updateTable('bank_transaction')
    .set({ outcome: 'dismissed' })
    .where('id', '=', transactionId)
    .where('outcome', 'in', ['unmatched', 'suggested'])
    .execute();
}
