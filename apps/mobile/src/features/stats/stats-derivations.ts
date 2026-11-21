import { formatEuros } from '@abonnements/core';
import type { CategoryCost, PriceIncreases, Stats } from '@/db/repositories/stats';
import { formatSignedEuros } from '@/features/subscriptions/price-history';
import type { StatsPeriod } from './types';

export const subscriptionCount = (n: number) => `${n} abonnement${n > 1 ? 's' : ''}`;

/** Part d'une catégorie dans le total, en pourcentage entier. */
export function categoryShare(cents: number, totalCents: number): number {
  return totalCents > 0 ? Math.round((cents / totalCents) * 100) : 0;
}

/** Largeur de la barre : au moins 2 % pour rester visible. */
export function barWidth(pct: number): `${number}%` {
  return `${Math.max(pct, 2)}%`;
}

export function categoryAmountLabel(row: CategoryCost, pct: number): string {
  return `${formatEuros(row.cents)} · ${pct} %`;
}

export function categoryAccessibilityLabel(row: CategoryCost, pct: number): string {
  return `${row.category} : ${formatEuros(row.cents)}, ${pct} %`;
}

/** Valeur de la ligne « Hausses sur 12 mois » : nombre de hausses et surcoût cumulé par an. */
export function priceIncreasesLabel(increases: PriceIncreases): string {
  return increases.count === 0 ? 'Aucune' : `${increases.count} · ${formatSignedEuros(increases.annualImpactCents)} par an`;
}

/** Chiffres affichés pour la période choisie (mensuelle ou annuelle). */
export function periodFigures(stats: Stats | undefined, period: StatsPeriod) {
  const month = period === 'month';
  return {
    caption: month ? 'Coût mensuel des abonnements actifs' : 'Coût annuel des abonnements actifs',
    otherLabel: month ? 'Par an' : 'Par mois',
    totalCents: stats ? (month ? stats.monthlyCents : stats.annualCents) : null,
    otherCents: stats ? (month ? stats.annualCents : stats.monthlyCents) : null,
    rows: stats ? (month ? stats.monthlyByCategory : stats.annualByCategory) : [],
  };
}
