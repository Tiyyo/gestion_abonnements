import {
  compareDates,
  type PaydayCharge,
  type PaydayPlan,
  type PaydayPlanInput,
  type PeriodUnit,
  periodMonths,
  type ProvisionedSubscription,
} from '@abonnements/core';
import type { PaydayBreakdownLine } from './types';

/** Prélèvement (réel ou provision) d'un abonnement non archivé, tel que lu pour le virement de paie. */
export interface PaydayRow {
  subscription_id: string;
  due_date: string;
  funded_amount_cents: number;
  status: string;
  provision_only: number;
  actual_date: string | null;
  name: string;
  period_unit: PeriodUnit;
  period_count: number;
}

const toCharge = (r: PaydayRow): PaydayCharge => ({
  subscriptionId: r.subscription_id,
  dueDate: r.due_date,
  fundedAmountCents: r.funded_amount_cents,
  status: r.status,
});

/** Abonnement à rythme long : provisions déjà versées depuis le dernier prélèvement payé. */
function provisionedSubscription(rows: readonly PaydayRow[], id: string): ProvisionedSubscription {
  const own = rows.filter((r) => r.subscription_id === id);
  const first = own[0];
  const lastPaid = own
    .filter((r) => r.provision_only === 0 && r.status === 'paid' && r.actual_date)
    .map((r) => r.actual_date as string)
    .sort(compareDates)
    .at(-1);
  const provisionedCents = own
    .filter((r) => r.provision_only === 1 && r.status === 'funded' && (!lastPaid || compareDates(r.due_date, lastPaid) > 0))
    .reduce((total, r) => total + r.funded_amount_cents, 0);
  return {
    subscriptionId: id,
    periodMonths: first ? periodMonths(first.period_unit, first.period_count) : 12,
    charges: own.filter((r) => r.provision_only === 0).map(toCharge),
    provisionedCents,
  };
}

/** Sépare les prélèvements mensuels (financés tels quels) des abonnements longs (provisionnés). */
export function paydayInputs(rows: readonly PaydayRow[]): Pick<PaydayPlanInput, 'monthlyCharges' | 'provisioned'> {
  const real = rows.filter((r) => r.provision_only === 0);
  const monthlyCharges = real.filter((r) => periodMonths(r.period_unit, r.period_count) <= 1).map(toCharge);
  const longIds = [...new Set(real.filter((r) => periodMonths(r.period_unit, r.period_count) > 1).map((r) => r.subscription_id))];
  return { monthlyCharges, provisioned: longIds.map((id) => provisionedSubscription(rows, id)) };
}

/** Détail affiché : une ligne cumulant les prélèvements, puis chaque provision ou complément nommé. */
export function paydayBreakdown(
  plan: PaydayPlan,
  names: ReadonlyMap<string, string>,
): { totalCents: number; lines: PaydayBreakdownLine[] } {
  const chargesTotal = plan.lines.filter((l) => l.kind === 'charge').reduce((t, l) => t + l.amountCents, 0);
  const lines: PaydayBreakdownLine[] = [{ kind: 'charges', subscriptionId: null, name: null, amountCents: chargesTotal }];
  for (const line of plan.lines) {
    if (line.kind !== 'charge') {
      lines.push({
        kind: line.kind,
        subscriptionId: line.subscriptionId,
        name: names.get(line.subscriptionId) ?? null,
        amountCents: line.amountCents,
      });
    }
  }
  return { totalCents: plan.totalCents, lines };
}
