import { effectiveMarginBp } from '@abonnements/core';
import type { Transfer } from '@/db/types';
import type { PlanTransfer } from './types';

export type TransferWithEffective = Transfer & { effective: string };

/** Prélèvement rattaché à un transfert, tel que lu par la jointure transfert → prélèvement → abonnement. */
export interface TransferLinkRow {
  transfer_id: string;
  charge_id: string;
  name: string;
  margin_override_bp: number | null;
  due_date: string;
  expected_amount_cents: number;
}

export function toPlanTransfers(
  transfers: readonly TransferWithEffective[],
  links: readonly TransferLinkRow[],
  globalMarginBp: number,
): PlanTransfer[] {
  return transfers.map((t) => {
    const own = links.filter((l) => l.transfer_id === t.id);
    return {
      id: t.id,
      plannedDate: t.planned_date,
      effectiveDate: t.effective,
      rescheduled: t.rescheduled_date !== null,
      amountCents: t.amount_cents,
      done: t.status === 'done',
      chargeIds: own.map((l) => l.charge_id),
      charges: own.map((l) => ({
        name: l.name,
        dueDate: l.due_date,
        expectedAmountCents: l.expected_amount_cents,
        marginBp: effectiveMarginBp(l.margin_override_bp, globalMarginBp),
      })),
    };
  });
}
