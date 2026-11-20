import { formatEuros } from '@abonnements/core';
import type { Stats } from '@/db/repositories/stats';
import type { MonthlyTrend, TrendMonth } from '@/db/repositories/stats-trend';
import { inMonth, monthName, trendTotalCents } from './trend-format';

export type ChangeDirection = 'up' | 'down' | 'flat';

export interface MonthChange {
  direction: ChangeDirection;
  /** Écart absolu, en centimes. */
  deltaCents: number;
  /** « Ce mois-ci : 4,00 € de plus qu’en octobre » */
  text: string;
}

/**
 * Moyenne mensuelle payée, en centimes : du premier mois avec un paiement au dernier mois terminé
 * (le mois en cours, incomplet, fausserait la moyenne). Sans mois terminé, on prend le mois en cours.
 * `null` s'il n'y a encore aucun paiement.
 */
export function averagePaidCents(months: readonly TrendMonth[]): { cents: number; monthCount: number } | null {
  const first = months.findIndex((m) => m.paidCents > 0);
  if (first === -1) {
    return null;
  }
  const complete = months.slice(first, months.length - 1);
  const range = complete.length > 0 ? complete : months.slice(first);
  const total = range.reduce((t, m) => t + m.paidCents, 0);
  return { cents: Math.round(total / range.length), monthCount: range.length };
}

/** « qu’en octobre », « qu’en août ». */
const thanIn = (month: string) => `qu’${inMonth(month)}`;

/**
 * Écart entre le mois en cours (payé + encore prévu) et le mois précédent (payé).
 * `null` si l'un des deux manque ou si les deux sont à zéro : il n'y a rien à comparer.
 */
export function monthChange(months: readonly TrendMonth[]): MonthChange | null {
  if (months.length < 2) {
    return null;
  }
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const delta = trendTotalCents(current) - trendTotalCents(previous);
  if (trendTotalCents(current) === 0 && trendTotalCents(previous) === 0) {
    return null;
  }
  if (delta === 0) {
    return { direction: 'flat', deltaCents: 0, text: `Ce mois-ci : autant ${thanIn(previous.month)}` };
  }
  const word = delta > 0 ? 'de plus' : 'de moins';
  return {
    direction: delta > 0 ? 'up' : 'down',
    deltaCents: Math.abs(delta),
    text: `Ce mois-ci : ${formatEuros(Math.abs(delta))} ${word} ${thanIn(previous.month)}`,
  };
}

export interface Insights {
  /** « Ça te coûte 391,64 € par an » ; `null` sans abonnement actif. */
  yearly: string | null;
  average: { value: string; label: string } | null;
  change: MonthChange | null;
  top: { name: string; value: string } | null;
  next: { label: string; value: string } | null;
}

const perYear = (cents: number) => `${formatEuros(cents)} par an`;

export function buildInsights(stats: Stats, trend: MonthlyTrend): Insights {
  const average = averagePaidCents(trend.months);
  const { nextMonth } = trend;
  return {
    yearly: stats.annualCents > 0 ? `Ça te coûte ${perYear(stats.annualCents)}` : null,
    average: average && {
      value: formatEuros(average.cents),
      label: average.monthCount > 1 ? `Moyenne payée par mois, sur ${average.monthCount} mois` : 'Moyenne payée par mois',
    },
    change: monthChange(trend.months),
    top: stats.topSubscription && { name: stats.topSubscription.name, value: perYear(stats.topSubscription.annualCents) },
    next:
      nextMonth.plannedCents > 0 ? { label: `Prévu en ${monthName(nextMonth.month)}`, value: formatEuros(nextMonth.plannedCents) } : null,
  };
}

/** Vrai si la carte n'aurait aucune ligne à montrer. */
export function isInsightsEmpty(i: Insights): boolean {
  return !i.yearly && !i.average && !i.change && !i.top && !i.next;
}
