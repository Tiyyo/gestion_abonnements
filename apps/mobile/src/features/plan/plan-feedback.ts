import { dateShort } from '@/lib/dates';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import type { PlanAction } from '@/features/plan/plan-action';

/**
 * Message affiché après une action du Plan faite sans confirmation, et commande inverse proposée par « Annuler ».
 * `undo` reçoit le résultat de la commande (identifiant du virement de paie créé) ; `null` = rien à annuler.
 */
export interface PlanFeedback {
  message: string;
  undo: (result: string | null) => PlanAction | null;
}

export function transferDoneFeedback(transferId: string): PlanFeedback {
  return { message: 'Transfert marqué fait.', undo: () => ({ type: 'transfer_undo', transferId }) };
}

/** Report (ou annulation de report) : « Annuler » remet la date d'avant. `null` si la date ne change pas. */
export function rescheduleFeedback(
  transfer: Pick<PlanTransfer, 'id' | 'rescheduled' | 'effectiveDate'>,
  date: string | null,
): PlanFeedback | null {
  const previous = transfer.rescheduled ? transfer.effectiveDate : null;
  if (date === previous) {
    return null;
  }
  return {
    message: date ? `Transfert reporté au ${dateShort(date)}` : 'Report annulé.',
    undo: () => ({ type: 'reschedule', transferId: transfer.id, date: previous }),
  };
}

export function paydayDoneFeedback(): PlanFeedback {
  return {
    message: 'Virement de paie marqué fait.',
    undo: (transferId) => (transferId ? { type: 'payday_undo', transferId } : null),
  };
}
