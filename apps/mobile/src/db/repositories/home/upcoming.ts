import { compareDates } from '@abonnements/core';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import type { HomeChargeRow, HomeUpcoming } from './types';

export const UPCOMING_COUNT = 3;

/** Prochains prélèvements voulus (triés par échéance en entrée), avec la date du transfert qui les finance. */
export function upcomingCharges(charges: readonly HomeChargeRow[], transfers: readonly PlanTransfer[], today: string): HomeUpcoming[] {
  const transferByCharge = new Map<string, string>();
  for (const t of transfers) {
    for (const id of t.chargeIds) {
      transferByCharge.set(id, t.effectiveDate);
    }
  }
  return charges
    .filter((c) => c.status !== 'unfunded' && compareDates(c.due_date, today) >= 0)
    .slice(0, UPCOMING_COUNT)
    .map((c) => ({
      chargeId: c.id,
      subscriptionId: c.subscription_id,
      name: c.name,
      dueDate: c.due_date,
      amountCents: c.expected_amount_cents,
      fundedAmountCents: c.funded_amount_cents,
      transferDate: transferByCharge.get(c.id) ?? null,
      funded: c.status === 'funded',
    }));
}
