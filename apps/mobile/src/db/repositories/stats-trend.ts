import { parts } from '@abonnements/core';
import { sql, type Kysely } from 'kysely';
import type { DB } from '@/db/types';

/** Nombre de mois calendaires de la tendance, mois en cours compris. */
export const TREND_MONTHS = 12;

export interface TrendMonth {
  /** Mois calendaire `YYYY-MM` (fuseau Europe/Paris, comme les dates des prélèvements). */
  month: string;
  /** Prélèvements confirmés payés ce mois-là (montant réel, date réelle). */
  paidCents: number;
  /** Prélèvements voulus encore à venir ce mois-là ; toujours 0 pour un mois passé. */
  plannedCents: number;
}

export interface MonthlyTrend {
  /** Les 12 derniers mois calendaires, du plus ancien au mois en cours, mois vides compris. */
  months: TrendMonth[];
  /** Le mois suivant : uniquement du prévu. */
  nextMonth: TrendMonth;
}

/** Décale un mois `YYYY-MM` de `delta` mois. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function monthOf(date: string): string {
  const { year, month } = parts(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

type Totals = Map<string, number>;

const toTotals = (rows: readonly { month: string; cents: number | null }[]): Totals =>
  new Map(rows.map((r) => [r.month, Number(r.cents ?? 0)]));

/** Mêmes prélèvements que « Dépensé sur 12 mois » : statut payé, hors provisions, montant et date réels. */
async function paidByMonth(db: Kysely<DB>, from: string, before: string): Promise<Totals> {
  const month = sql<string>`substr(actual_date, 1, 7)`;
  const rows = await db
    .selectFrom('charge')
    .select([month.as('month'), db.fn.sum<number>('actual_amount_cents').as('cents')])
    .where('status', '=', 'paid')
    .where('provision_only', '=', 0)
    .where('actual_date', '>=', `${from}-01`)
    .where('actual_date', '<', `${before}-01`)
    .groupBy(month)
    .execute();
  return toTotals(rows);
}

/** Même périmètre que le plan : un prélèvement non financé (essai, à résilier) est censé échouer, il n'est pas compté. */
async function plannedByMonth(db: Kysely<DB>, from: string, before: string): Promise<Totals> {
  const month = sql<string>`substr(charge.due_date, 1, 7)`;
  const rows = await db
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select([month.as('month'), db.fn.sum<number>('charge.expected_amount_cents').as('cents')])
    .where('charge.status', 'in', ['planned', 'funded'])
    .where('charge.provision_only', '=', 0)
    .where('subscription.archived_at', 'is', null)
    .where('charge.due_date', '>=', `${from}-01`)
    .where('charge.due_date', '<', `${before}-01`)
    .groupBy(month)
    .execute();
  return toTotals(rows);
}

/** Dépenses mois par mois : payé sur les 12 derniers mois calendaires, prévu pour le mois en cours et le suivant. */
export async function loadMonthlyTrend(db: Kysely<DB>, today: string): Promise<MonthlyTrend> {
  const current = monthOf(today);
  const first = shiftMonth(current, -(TREND_MONTHS - 1));
  const next = shiftMonth(current, 1);
  const paid = await paidByMonth(db, first, next);
  const planned = await plannedByMonth(db, current, shiftMonth(current, 2));
  const point = (month: string): TrendMonth => ({
    month,
    paidCents: paid.get(month) ?? 0,
    plannedCents: planned.get(month) ?? 0,
  });
  return {
    months: Array.from({ length: TREND_MONTHS }, (_, i) => point(shiftMonth(first, i))),
    nextMonth: { ...point(next), paidCents: 0 },
  };
}
