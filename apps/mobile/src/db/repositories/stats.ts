import { type Kysely, sql } from 'kysely';
import { addDays, isPriceIncrease, parsePriceChange } from '@abonnements/core';
import type { DB } from '@/db/types';

export interface CategoryCost {
  category: string;
  cents: number;
}

export interface Stats {
  monthlyCents: number;
  annualCents: number;
  monthlyByCategory: CategoryCost[];
  annualByCategory: CategoryCost[];
  monthlySubscriptionsCents: number;
  longSubscriptionsPerMonthCents: number;
  excludedCount: number;
  spentLast12MonthsCents: number;
  /** Abonnement actif le plus cher, ramené à l'année. */
  topSubscription: { name: string; annualCents: number } | null;
  priceIncreases: PriceIncreases;
}

/** Hausses de prix des 12 derniers mois sur les abonnements actifs, et leur surcoût cumulé par an. */
export interface PriceIncreases {
  count: number;
  annualImpactCents: number;
}

export function annualCents(amountCents: number, unit: 'week' | 'month' | 'year', count: number): number {
  if (unit === 'week') {
    return Math.round((amountCents * 52) / count);
  }
  if (unit === 'month') {
    return Math.round((amountCents * 12) / count);
  }
  return Math.round(amountCents / count);
}

function byCategory(rows: readonly { category: string; cents: number }[]): CategoryCost[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.category, (totals.get(r.category) ?? 0) + r.cents);
  }
  return [...totals.entries()].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents);
}

export async function loadPriceIncreases(db: Kysely<DB>, today: string): Promise<PriceIncreases> {
  const rows = await db
    .selectFrom('event')
    .innerJoin('subscription', 'subscription.id', 'event.subscription_id')
    .select(['event.payload', 'subscription.period_unit', 'subscription.period_count'])
    .where('event.type', '=', 'price_change')
    .where('event.occurred_on', '>', addDays(today, -365))
    .where('event.occurred_on', '<=', today)
    .where('subscription.archived_at', 'is', null)
    .where('subscription.status', '=', 'active')
    .orderBy(sql`event.rowid`)
    .execute();
  const result: PriceIncreases = { count: 0, annualImpactCents: 0 };
  for (const row of rows) {
    const change = parsePriceChange(row.payload);
    if (change && isPriceIncrease(change)) {
      result.count += 1;
      result.annualImpactCents +=
        annualCents(change.to, row.period_unit, row.period_count) - annualCents(change.from, row.period_unit, row.period_count);
    }
  }
  return result;
}

export async function loadStats(db: Kysely<DB>, today: string): Promise<Stats> {
  const subs = await db
    .selectFrom('subscription')
    .innerJoin('category', 'category.id', 'subscription.category_id')
    .select([
      'subscription.name',
      'subscription.status',
      'subscription.amount_cents',
      'subscription.period_unit',
      'subscription.period_count',
      'category.name as category',
    ])
    .where('subscription.archived_at', 'is', null)
    .execute();
  const active = subs
    .filter((s) => s.status === 'active')
    .map((s) => {
      const annual = annualCents(s.amount_cents, s.period_unit, s.period_count);
      const long = s.period_unit === 'year' || (s.period_unit === 'month' && s.period_count > 1);
      return { name: s.name, category: s.category, annual, monthly: Math.round(annual / 12), long };
    });
  const spent = await db
    .selectFrom('charge')
    .select(db.fn.sum<number>('actual_amount_cents').as('total'))
    .where('status', '=', 'paid')
    .where('provision_only', '=', 0)
    .where('actual_date', '>', addDays(today, -365))
    .executeTakeFirst();
  const top = active.reduce<(typeof active)[number] | null>((best, s) => (best && best.annual >= s.annual ? best : s), null);

  return {
    monthlyCents: active.reduce((t, s) => t + s.monthly, 0),
    annualCents: active.reduce((t, s) => t + s.annual, 0),
    monthlyByCategory: byCategory(active.map((s) => ({ category: s.category, cents: s.monthly }))),
    annualByCategory: byCategory(active.map((s) => ({ category: s.category, cents: s.annual }))),
    monthlySubscriptionsCents: active.filter((s) => !s.long).reduce((t, s) => t + s.monthly, 0),
    longSubscriptionsPerMonthCents: active.filter((s) => s.long).reduce((t, s) => t + s.monthly, 0),
    excludedCount: subs.filter((s) => s.status === 'trial' || s.status === 'to_cancel').length,
    spentLast12MonthsCents: Number(spent?.total ?? 0),
    topSubscription: top ? { name: top.name, annualCents: top.annual } : null,
    priceIncreases: await loadPriceIncreases(db, today),
  };
}
