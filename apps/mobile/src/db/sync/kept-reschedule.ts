import { compareDates } from '@abonnements/core';

/**
 * Report conservé lors de la régénération d'un transfert : il ne tient que s'il reste au plus tard
 * le jour du premier prélèvement financé (sinon le prélèvement passerait avant l'argent).
 */
export function keptRescheduledDate(rescheduledDate: string | null, dueDates: readonly string[], plannedDate: string): string | null {
  const firstDue = [...dueDates].sort(compareDates)[0] ?? plannedDate;
  return rescheduledDate && compareDates(rescheduledDate, firstDue) <= 0 ? rescheduledDate : null;
}
