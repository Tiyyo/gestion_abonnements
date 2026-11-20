import { compareDates } from '@abonnements/core';
import type { PlanTransfer } from '@/db/repositories/plan/types';

/** Dernière date possible pour reporter un transfert : le premier prélèvement qu'il finance (à défaut, sa date prévue). */
export function rescheduleLimit(transfer: Pick<PlanTransfer, 'charges' | 'plannedDate'>): string {
  return transfer.charges.map((c) => c.dueDate).sort(compareDates)[0] ?? transfer.plannedDate;
}

/** Date à enregistrer pour un report : revenir à la date prévue annule le report (`null`). */
export function rescheduleValue(chosen: string, plannedDate: string): string | null {
  return chosen === plannedDate ? null : chosen;
}
