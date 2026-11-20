import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { nowIso } from '@/db/now-iso';
import type { DB } from '@/db/types';

/** Complète le financement d'un prélèvement plus cher que prévu ; rend le montant transféré (0 si rien à faire). */
export async function correctiveTransfer(
  db: Kysely<DB>,
  chargeId: string,
  newAmountCents: number,
  today: string,
  newId: NewId,
): Promise<number> {
  return db.transaction().execute(async (trx) => {
    const charge = await trx.selectFrom('charge').selectAll().where('id', '=', chargeId).executeTakeFirstOrThrow();
    const diff = newAmountCents - charge.funded_amount_cents;
    if (diff <= 0) {
      return 0;
    }
    const transferId = newId();
    await trx
      .insertInto('transfer')
      .values({
        id: transferId,
        type: 'vault_to_main',
        planned_date: today,
        amount_cents: diff,
        status: 'done',
        done_at: nowIso(),
      })
      .execute();
    await trx.insertInto('transfer_charge').values({ transfer_id: transferId, charge_id: chargeId, amount_cents: diff }).execute();
    await trx
      .updateTable('charge')
      .set({ expected_amount_cents: newAmountCents, funded_amount_cents: newAmountCents, status: 'funded' })
      .where('id', '=', chargeId)
      .execute();
    return diff;
  });
}
