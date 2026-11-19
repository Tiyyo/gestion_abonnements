import { compareDates, type IsoDate, parts } from './calendar';
import { paydayDate, transferDate } from './funding';
import { ceilDiv } from './money';
import type { PeriodUnit } from './types';

export interface PaydayPeriod {
  start: IsoDate;
  end: IsoDate;
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}

export function paydayPeriodContaining(date: IsoDate, paydayDay: number): PaydayPeriod {
  const { year, month } = parts(date);
  for (const delta of [1, 0, -1]) {
    const [y, m] = shiftMonth(year, month, delta);
    const start = paydayDate(y, m, paydayDay);
    if (compareDates(start, date) <= 0) {
      const [ny, nm] = shiftMonth(y, m, 1);
      return { start, end: paydayDate(ny, nm, paydayDay) };
    }
  }
  throw new Error(`période de paie introuvable pour ${date}`);
}

export function isInPeriod(date: IsoDate, period: PaydayPeriod): boolean {
  return compareDates(date, period.start) >= 0 && compareDates(date, period.end) < 0;
}

export function periodMonths(unit: PeriodUnit, count: number): number {
  if (unit === 'week') {
    return 0;
  }
  return unit === 'year' ? 12 * count : count;
}

export function isProvisioned(unit: PeriodUnit, count: number): boolean {
  return periodMonths(unit, count) > 1;
}

export interface PaydayCharge {
  subscriptionId: string;
  dueDate: IsoDate;
  fundedAmountCents: number;
  status: string;
}

export interface ProvisionedSubscription {
  subscriptionId: string;
  periodMonths: number;
  charges: readonly PaydayCharge[];
  provisionedCents: number;
}

export type PaydayLine =
  | { kind: 'charge'; subscriptionId: string; dueDate: IsoDate; amountCents: number }
  | { kind: 'complement'; subscriptionId: string; dueDate: IsoDate; amountCents: number }
  | { kind: 'provision'; subscriptionId: string; amountCents: number };

export interface PaydayPlanInput {
  period: PaydayPeriod;
  fundingLeadDays: number;
  monthlyCharges: readonly PaydayCharge[];
  provisioned: readonly ProvisionedSubscription[];
}

export interface PaydayPlan {
  lines: PaydayLine[];
  totalCents: number;
}

const fundable = (charge: PaydayCharge) => charge.status === 'planned' || charge.status === 'funded';

export function paydayPlan(input: PaydayPlanInput): PaydayPlan {
  const inPeriod = (charge: PaydayCharge) =>
    fundable(charge) && isInPeriod(transferDate(charge.dueDate, input.fundingLeadDays), input.period);

  const lines: PaydayLine[] = input.monthlyCharges.filter(inPeriod).map((charge) => ({
    kind: 'charge',
    subscriptionId: charge.subscriptionId,
    dueDate: charge.dueDate,
    amountCents: charge.fundedAmountCents,
  }));

  for (const subscription of input.provisioned) {
    const due = subscription.charges.find(inPeriod);
    if (due) {
      const remaining = Math.max(0, due.fundedAmountCents - subscription.provisionedCents);
      lines.push({
        kind: 'complement',
        subscriptionId: subscription.subscriptionId,
        dueDate: due.dueDate,
        amountCents: remaining,
      });
      continue;
    }
    const next = subscription.charges.filter(fundable).sort((a, b) => compareDates(a.dueDate, b.dueDate))[0];
    if (!next) {
      continue;
    }
    const perPeriod = ceilDiv(next.fundedAmountCents, subscription.periodMonths);
    const amount = Math.min(perPeriod, Math.max(0, next.fundedAmountCents - subscription.provisionedCents));
    if (amount > 0) {
      lines.push({ kind: 'provision', subscriptionId: subscription.subscriptionId, amountCents: amount });
    }
  }

  return { lines, totalCents: lines.reduce((total, line) => total + line.amountCents, 0) };
}
