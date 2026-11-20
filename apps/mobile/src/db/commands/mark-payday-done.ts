import type { PaydayPeriod } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { nowIso } from '@/db/now-iso';
import { computePayday } from '@/db/repositories/plan/compute-payday';
import { findPaydayTransfer } from '@/db/repositories/plan/payday-transfer';
import type { DB } from '@/db/types';

/** Enregistre le virement de paie de la période ; renvoie son identifiant, ou `null` s'il était déjà enregistré (rien n'est fait). */
export async function markPaydayDone(db: Kysely<DB>, period: PaydayPeriod, newId: NewId): Promise<string | null> {
  return db.transaction().execute(async (trx) => {
    if (await findPaydayTransfer(trx, period.start)) {
      return null;
    }
    const { totalCents, lines } = await computePayday(trx, period);
    const transferId = newId();
    await trx
      .insertInto('transfer')
      .values({ id: transferId, type: 'payday', planned_date: period.start, amount_cents: totalCents, status: 'done', done_at: nowIso() })
      .execute();
    for (const line of lines) {
      if (line.kind !== 'provision' || !line.subscriptionId || line.amountCents <= 0) {
        continue;
      }
      const chargeId = newId();
      await trx
        .insertInto('charge')
        .values({
          id: chargeId,
          subscription_id: line.subscriptionId,
          due_date: period.start,
          expected_amount_cents: line.amountCents,
          funded_amount_cents: line.amountCents,
          status: 'funded',
          provision_only: 1,
        })
        .execute();
      await trx
        .insertInto('transfer_charge')
        .values({ transfer_id: transferId, charge_id: chargeId, amount_cents: line.amountCents })
        .execute();
    }
    return transferId;
  });
}
