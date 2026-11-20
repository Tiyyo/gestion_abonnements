import { formatEuros } from '@abonnements/core';
import type { TrendMonth } from '@/db/repositories/stats-trend';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const monthIndex = (month: string) => Math.min(Math.max(Number(month.slice(5, 7)) - 1, 0), 11);

/** « novembre » */
export const monthName = (month: string) => MONTHS[monthIndex(month)];

/** « novembre 2026 » */
export const monthLabel = (month: string) => `${monthName(month)} ${month.slice(0, 4)}`;

/** « nov. » : libellé sous la barre. */
export const monthShortLabel = (month: string) => SHORT[monthIndex(month)];

/** « en novembre », « en août ». */
export const inMonth = (month: string) => `en ${monthName(month)}`;

export const trendTotalCents = (m: TrendMonth) => m.paidCents + m.plannedCents;

/** Détail du prévu quand un mois mêle payé et à venir. */
function plannedDetail(m: TrendMonth): string | null {
  if (m.plannedCents <= 0) {
    return null;
  }
  return m.paidCents > 0 ? `dont ${formatEuros(m.plannedCents)} à venir` : 'à venir';
}

/** Légende au-dessus du graphique pour le mois choisi : « novembre 2026 » et son montant exact. */
export function trendSelection(m: TrendMonth): { title: string; amount: string; detail: string | null } {
  return { title: monthLabel(m.month), amount: formatEuros(trendTotalCents(m)), detail: plannedDetail(m) };
}

/** « novembre 2026 : 21,98 € », avec la part à venir le cas échéant. */
export function trendColumnLabel(m: TrendMonth): string {
  const detail = plannedDetail(m);
  return `${monthLabel(m.month)} : ${formatEuros(trendTotalCents(m))}${detail ? `, ${detail}` : ''}`;
}

/** Résumé lu par le lecteur d'écran : mois le plus bas, le plus haut, mois en cours. */
export function trendSummaryLabel(months: readonly TrendMonth[]): string {
  if (months.length === 0) {
    return 'Dépenses par mois : aucune donnée.';
  }
  const sorted = [...months].sort((a, b) => trendTotalCents(a) - trendTotalCents(b));
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const current = months[months.length - 1];
  return (
    `Dépenses par mois sur ${months.length} mois. ` +
    `Minimum : ${formatEuros(trendTotalCents(min))} ${inMonth(min.month)} ${min.month.slice(0, 4)}. ` +
    `Maximum : ${formatEuros(trendTotalCents(max))} ${inMonth(max.month)} ${max.month.slice(0, 4)}. ` +
    `Mois en cours, ${trendColumnLabel(current)}.`
  );
}

/** Vrai s'il n'y a rien à tracer : aucun paiement confirmé ni prélèvement prévu. */
export const isTrendEmpty = (months: readonly TrendMonth[]) => months.every((m) => trendTotalCents(m) === 0);
