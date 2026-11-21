import { formatEuros, parsePriceChange, priceChangeBp, type PriceChangeSource } from '@abonnements/core';
import { annualCents } from '@/db/repositories/stats';
import { dateShortYear } from '@/lib/dates';
import { formatPercentBp } from '@/lib/format';

export interface PriceEventSource {
  id: string;
  type: string;
  occurred_on: string;
  created_at: string;
  payload: string;
}

export interface PriceChangeItem {
  id: string;
  date: string;
  fromCents: number;
  toCents: number;
  diffCents: number;
  /** Variation en points de base ; `null` si l'ancien prix était nul. */
  diffBp: number | null;
  direction: 'up' | 'down';
  source: PriceChangeSource;
}

interface Periodicity {
  period_unit: 'week' | 'month' | 'year';
  period_count: number;
}

const sign = (value: number) => (value > 0 ? '+' : value < 0 ? '−' : '');

/** Montant avec son signe : « +2,00 € », « −1,50 € ». */
export function formatSignedEuros(cents: number): string {
  return `${sign(cents)}${formatEuros(Math.abs(cents))}`;
}

/** Variation avec son signe : « +8,3 % ». */
export function formatSignedPercentBp(bp: number): string {
  return `${sign(bp)}${formatPercentBp(Math.abs(bp))}`;
}

/**
 * Changements de prix appliqués à l'abonnement, du plus ancien au plus récent. Les écarts ponctuels non reportés
 * (`applied: false`) et les événements aux montants illisibles sont laissés à l'historique textuel.
 */
export function buildPriceHistory(events: readonly PriceEventSource[]): PriceChangeItem[] {
  const items: (PriceChangeItem & { sort: string })[] = [];
  for (const event of events) {
    const change = event.type === 'price_change' ? parsePriceChange(event.payload) : null;
    if (change?.applied) {
      items.push({
        id: event.id,
        date: event.occurred_on,
        fromCents: change.from,
        toCents: change.to,
        diffCents: change.to - change.from,
        diffBp: priceChangeBp(change.from, change.to),
        direction: change.to > change.from ? 'up' : 'down',
        source: change.source,
        sort: event.created_at,
      });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.sort.localeCompare(b.sort)).map(({ sort: _sort, ...item }) => item);
}

/** Paliers de prix successifs pour le graphique : le prix de départ, puis le prix après chaque changement. */
export function priceLevels(items: readonly PriceChangeItem[]): number[] {
  const first = items[0];
  return first ? [first.fromCents, ...items.map((i) => i.toCents)] : [];
}

export const directionLabel = (item: PriceChangeItem) => (item.direction === 'up' ? 'Hausse' : 'Baisse');

const SOURCE_LABELS: Record<PriceChangeSource, string> = { manual: 'modifié à la main', reconciliation: 'constaté au rapprochement' };

/** « 12 mars 2026 · constaté au rapprochement ». */
export function changeCaption(item: PriceChangeItem): string {
  return `${dateShortYear(item.date)} · ${SOURCE_LABELS[item.source]}`;
}

/** « 11,99 € → 12,99 € ». */
export function changeAmounts(item: PriceChangeItem): string {
  return `${formatEuros(item.fromCents)} → ${formatEuros(item.toCents)}`;
}

/** « +1,00 € · +8,3 % » (sans pourcentage si l'ancien prix était nul). */
export function changeDelta(item: PriceChangeItem): string {
  const euros = formatSignedEuros(item.diffCents);
  return item.diffBp === null ? euros : `${euros} · ${formatSignedPercentBp(item.diffBp)}`;
}

export function changeAccessibilityLabel(item: PriceChangeItem): string {
  return `${directionLabel(item)} du ${dateShortYear(item.date)} : de ${formatEuros(item.fromCents)} à ${formatEuros(item.toCents)}, ${changeDelta(item).replace(' · ', ', ')}`;
}

/** Surcoût (ou économie) annuel d'un passage de `from` à `to`, selon la périodicité de l'abonnement. */
export function annualImpactCents(from: number, to: number, sub: Periodicity): number {
  return annualCents(to, sub.period_unit, sub.period_count) - annualCents(from, sub.period_unit, sub.period_count);
}

/** « +2,00 € depuis le 12 mars 2026, soit +24,00 € par an » ; `null` sans changement. */
export function priceSummary(items: readonly PriceChangeItem[], sub: Periodicity): string | null {
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    return null;
  }
  const since = `depuis le ${dateShortYear(first.date)}`;
  const diff = last.toCents - first.fromCents;
  if (diff === 0) {
    return `Prix revenu à son niveau d’origine ${since}`;
  }
  return `${formatSignedEuros(diff)} ${since}, soit ${formatSignedEuros(annualImpactCents(first.fromCents, last.toCents, sub))} par an`;
}

/** Description du graphique pour les lecteurs d'écran. */
export function chartAccessibilityLabel(items: readonly PriceChangeItem[]): string {
  const levels = priceLevels(items);
  const count = items.length;
  return `Évolution du prix : de ${formatEuros(levels[0] ?? 0)} à ${formatEuros(levels[levels.length - 1] ?? 0)} en ${count} changement${count > 1 ? 's' : ''}`;
}
