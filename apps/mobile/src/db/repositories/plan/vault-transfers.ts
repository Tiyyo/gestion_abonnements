import { compareDates, effectiveTransferDate } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import { toPlanTransfers } from './plan-transfers';
import type { PlanTransfer } from './types';

export async function loadVaultTransfers(
  db: Kysely<DB>,
  globalMarginBp: number,
  keep: (t: { effective: string; status: string }) => boolean,
): Promise<PlanTransfer[]> {
  const transfers = (await db.selectFrom('transfer').selectAll().where('type', '=', 'vault_to_main').execute())
    .map((t) => ({ ...t, effective: effectiveTransferDate({ plannedDate: t.planned_date, rescheduledDate: t.rescheduled_date }) }))
    .filter(keep)
    .sort((a, b) => compareDates(a.effective, b.effective));
  if (transfers.length === 0) {
    return [];
  }
  const links = await db
    .selectFrom('transfer_charge')
    .innerJoin('charge', 'charge.id', 'transfer_charge.charge_id')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select([
      'transfer_charge.transfer_id',
      'transfer_charge.charge_id',
      'subscription.name',
      'subscription.margin_override_bp',
      'charge.due_date',
      'charge.expected_amount_cents',
    ])
    .where(
      'transfer_charge.transfer_id',
      'in',
      transfers.map((t) => t.id),
    )
    .orderBy('charge.due_date')
    .execute();
  return toPlanTransfers(transfers, links, globalMarginBp);
}
