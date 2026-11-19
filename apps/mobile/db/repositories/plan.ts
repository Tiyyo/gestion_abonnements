import {
  compareDates,
  effectiveMarginBp,
  effectiveTransferDate,
  forgottenTrialRisk,
  isInPeriod,
  type Ledger,
  paydayDate,
  type PaydayPeriod,
  paydayPlan,
  periodMonths,
  projectedBalance,
  residualToReturn,
} from '@abonnements/core';
import type { Kysely, Transaction } from 'kysely';
import type { DB } from '../types';
import { loadLedger } from './ledger';

type Executor = Kysely<DB> | Transaction<DB>;

export interface PaydayBreakdownLine {
  kind: 'charges' | 'provision' | 'complement';
  subscriptionId: string | null;
  name: string | null;
  amountCents: number;
}

export interface PaydayView {
  date: string;
  transferId: string | null;
  done: boolean;
  totalCents: number;
  lines: PaydayBreakdownLine[];
}

export interface PlanTransferCharge {
  name: string;
  dueDate: string;
  expectedAmountCents: number;
  marginBp: number;
}

export interface PlanTransfer {
  id: string;
  plannedDate: string;
  effectiveDate: string;
  rescheduled: boolean;
  amountCents: number;
  done: boolean;
  chargeIds: string[];
  charges: PlanTransferCharge[];
}

export interface PlanTrial {
  subscriptionId: string;
  name: string;
  dueDate: string;
  amountCents: number;
  risk: boolean;
  projectedCents: number;
}

export interface MonthPlan {
  period: PaydayPeriod;
  globalMarginBp: number;
  payday: PaydayView;
  transfers: PlanTransfer[];
  trials: PlanTrial[];
  residualCents: number | null;
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}

export function periodForMonth(year: number, month: number, paydayDay: number): PaydayPeriod {
  const [ny, nm] = shiftMonth(year, month, 1);
  return { start: paydayDate(year, month, paydayDay), end: paydayDate(ny, nm, paydayDay) };
}

export async function computePayday(trx: Executor, period: PaydayPeriod): Promise<{ totalCents: number; lines: PaydayBreakdownLine[] }> {
  const settings = await trx.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const rows = await trx
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select([
      'charge.subscription_id',
      'charge.due_date',
      'charge.funded_amount_cents',
      'charge.status',
      'charge.provision_only',
      'charge.actual_date',
      'subscription.name',
      'subscription.period_unit',
      'subscription.period_count',
    ])
    .where('subscription.archived_at', 'is', null)
    .execute();

  const names = new Map(rows.map((r) => [r.subscription_id, r.name]));
  const real = rows.filter((r) => r.provision_only === 0);
  const toCharge = (r: (typeof rows)[number]) => ({
    subscriptionId: r.subscription_id,
    dueDate: r.due_date,
    fundedAmountCents: r.funded_amount_cents,
    status: r.status,
  });

  const monthlyCharges = real.filter((r) => periodMonths(r.period_unit, r.period_count) <= 1).map(toCharge);
  const longIds = [...new Set(real.filter((r) => periodMonths(r.period_unit, r.period_count) > 1).map((r) => r.subscription_id))];
  const provisioned = longIds.map((id) => {
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
  });

  const plan = paydayPlan({ period, fundingLeadDays: settings.funding_lead_days, monthlyCharges, provisioned });
  const chargesTotal = plan.lines.filter((l) => l.kind === 'charge').reduce((t, l) => t + l.amountCents, 0);
  const lines: PaydayBreakdownLine[] = [{ kind: 'charges', subscriptionId: null, name: null, amountCents: chargesTotal }];
  for (const line of plan.lines) {
    if (line.kind !== 'charge') {
      lines.push({ kind: line.kind, subscriptionId: line.subscriptionId, name: names.get(line.subscriptionId) ?? null, amountCents: line.amountCents });
    }
  }
  return { totalCents: plan.totalCents, lines };
}

async function loadPayday(db: Kysely<DB>, period: PaydayPeriod): Promise<PaydayView> {
  const stored = await db
    .selectFrom('transfer')
    .selectAll()
    .where('type', '=', 'payday')
    .where('planned_date', '=', period.start)
    .executeTakeFirst();
  if (!stored) {
    const computed = await computePayday(db, period);
    return { date: period.start, transferId: null, done: false, ...computed };
  }
  const provisions = await db
    .selectFrom('transfer_charge')
    .innerJoin('charge', 'charge.id', 'transfer_charge.charge_id')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select(['subscription.id', 'subscription.name', 'transfer_charge.amount_cents'])
    .where('transfer_charge.transfer_id', '=', stored.id)
    .execute();
  const provisionTotal = provisions.reduce((t, p) => t + p.amount_cents, 0);
  return {
    date: period.start,
    transferId: stored.id,
    done: stored.status === 'done',
    totalCents: stored.amount_cents,
    lines: [
      { kind: 'charges', subscriptionId: null, name: null, amountCents: stored.amount_cents - provisionTotal },
      ...provisions.map((p) => ({ kind: 'provision' as const, subscriptionId: p.id, name: p.name, amountCents: p.amount_cents })),
    ],
  };
}

export async function loadVaultTransfers(
  db: Kysely<DB>,
  globalMarginBp: number,
  keep: (t: { effective: string; status: string }) => boolean,
): Promise<PlanTransfer[]> {
  const transfers = (await db.selectFrom('transfer').selectAll().where('type', '=', 'vault_to_main').execute())
    .map((t) => ({ ...t, effective: effectiveTransferDate({ plannedDate: t.planned_date, rescheduledDate: t.rescheduled_date }) }))
    .filter(keep)
    .sort((a, b) => compareDates(a.effective, b.effective));
  if (transfers.length === 0) {
    return [];
  }
  const links = await db
    .selectFrom('transfer_charge')
    .innerJoin('charge', 'charge.id', 'transfer_charge.charge_id')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select([
      'transfer_charge.transfer_id',
      'transfer_charge.charge_id',
      'subscription.name',
      'subscription.margin_override_bp',
      'charge.due_date',
      'charge.expected_amount_cents',
    ])
    .where('transfer_charge.transfer_id', 'in', transfers.map((t) => t.id))
    .orderBy('charge.due_date')
    .execute();
  return transfers.map((t) => ({
    id: t.id,
    plannedDate: t.planned_date,
    effectiveDate: t.effective,
    rescheduled: t.rescheduled_date !== null,
    amountCents: t.amount_cents,
    done: t.status === 'done',
    chargeIds: links.filter((l) => l.transfer_id === t.id).map((l) => l.charge_id),
    charges: links
      .filter((l) => l.transfer_id === t.id)
      .map((l) => ({
        name: l.name,
        dueDate: l.due_date,
        expectedAmountCents: l.expected_amount_cents,
        marginBp: effectiveMarginBp(l.margin_override_bp, globalMarginBp),
      })),
  }));
}

export async function loadTrials(db: Kysely<DB>, today: string, ledger: Ledger, period?: PaydayPeriod): Promise<PlanTrial[]> {
  const conversions = await db
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .selectAll('charge')
    .select('subscription.name')
    .where('charge.is_trial_conversion', '=', 1)
    .where('charge.status', '=', 'unfunded')
    .where('subscription.status', '=', 'trial')
    .where('subscription.archived_at', 'is', null)
    .where('charge.due_date', '>=', today)
    .orderBy('charge.due_date')
    .execute();
  return conversions
    .filter((c) => !period || isInPeriod(c.due_date, period))
    .map((c) => ({
      subscriptionId: c.subscription_id,
      name: c.name,
      dueDate: c.due_date,
      amountCents: c.expected_amount_cents,
      projectedCents: projectedBalance(ledger, today, c.due_date),
      risk: forgottenTrialRisk(ledger, today, {
        status: c.status,
        dueDate: c.due_date,
        fundedAmountCents: c.funded_amount_cents,
        expectedAmountCents: c.expected_amount_cents,
        actualAmountCents: c.actual_amount_cents,
        actualDate: c.actual_date,
        provisionOnly: false,
      }),
    }));
}

export async function loadMonthPlan(db: Kysely<DB>, year: number, month: number, today: string): Promise<MonthPlan> {
  const settings = await db.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const period = periodForMonth(year, month, settings.payday_day);
  const ledger = await loadLedger(db);
  const [payday, transfers, trials] = await Promise.all([
    loadPayday(db, period),
    loadVaultTransfers(db, settings.global_margin_bp, (t) => isInPeriod(t.effective, period)),
    loadTrials(db, today, ledger, period),
  ]);
  return {
    period,
    globalMarginBp: settings.global_margin_bp,
    payday,
    transfers,
    trials,
    residualCents: isInPeriod(today, period) ? residualToReturn(ledger, today) : null,
  };
}
