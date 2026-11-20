import { ceilDiv, isProvisioned, type PeriodUnit, periodMonths } from '@abonnements/core';

/** Mise de côté mensuelle d'un abonnement provisionné (trimestriel et plus), `null` sinon. */
export function monthlyProvisionCents(fundedCents: number, unit: PeriodUnit, count: number): number | null {
  return isProvisioned(unit, count) ? ceilDiv(fundedCents, periodMonths(unit, count)) : null;
}
