import { ceilDiv, isProvisioned, type PeriodUnit, periodMonths } from '@abonnements/core';

/** Mise de côté mensuelle d'un abonnement provisionné (trimestriel et plus), `null` sinon. */
export function monthlyProvisionCents(fundedCents: number, unit: PeriodUnit, count: number): number | null {
  return isProvisioned(unit, count) ? ceilDiv(fundedCents, periodMonths(unit, count)) : null;
}

const WEEKS_PER_YEAR = 52;

/** Coût ramené au mois, pour comparer des périodicités différentes (hebdomadaire : 52 semaines sur 12 mois), arrondi au centime. */
export function monthlyEquivalentCents(amountCents: number, unit: PeriodUnit, count: number): number {
  if (unit === 'week') {
    return Math.round((amountCents * WEEKS_PER_YEAR) / (12 * count));
  }
  return Math.round(amountCents / periodMonths(unit, count));
}
