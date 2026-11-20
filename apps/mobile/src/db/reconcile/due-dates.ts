import { compareDates, nthDueDate, type SubscriptionSnapshot } from '@abonnements/core';

/** Première échéance (à partir de la n-ième) qui n'est pas déjà passée. */
export function firstDueOnOrAfter(snapshot: SubscriptionSnapshot, today: string, from = 1): string {
  let n = from;
  while (compareDates(nthDueDate(snapshot, n), today) < 0) {
    n += 1;
  }
  return nthDueDate(snapshot, n);
}

/**
 * Nombre d'échéances passées et déjà closes (payées, échouées, sautées) à enjamber depuis la prochaine
 * échéance enregistrée : on s'arrête à la première échéance à venir ou encore ouverte.
 */
export function closedPastDueCount(snapshot: SubscriptionSnapshot, today: string, closed: ReadonlySet<string>): number {
  let n = 0;
  while (compareDates(nthDueDate(snapshot, n), today) < 0 && closed.has(nthDueDate(snapshot, n))) {
    n += 1;
  }
  return n;
}
