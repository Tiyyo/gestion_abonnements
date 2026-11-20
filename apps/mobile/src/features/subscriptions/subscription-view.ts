import { normalizeName } from '@abonnements/core';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { monthlyEquivalentCents } from './funding';
import { byName, byNextDate, cancelledByName, groupByStatus, type RowComparator, type SubscriptionGroup } from './subscription-groups';

/** Recherche et tri n'apparaissent qu'au-delà de ce nombre d'abonnements (résiliés compris) : en dessous, c'est du bruit. */
export const SEARCH_SORT_THRESHOLD = 5;

export type SubscriptionSort = 'next_charge' | 'monthly_amount' | 'name';

export const DEFAULT_SORT: SubscriptionSort = 'next_charge';

export const SORT_OPTIONS: readonly { key: SubscriptionSort; label: string; hint: string }[] = [
  { key: 'next_charge', label: 'Prochain prélèvement', hint: 'Le plus proche d’abord' },
  { key: 'monthly_amount', label: 'Montant mensuel', hint: 'Du plus cher au moins cher, ramené au mois' },
  { key: 'name', label: 'Nom', hint: 'De A à Z' },
];

export function sortLabel(sort: SubscriptionSort): string {
  return SORT_OPTIONS.find((o) => o.key === sort)?.label ?? '';
}

const monthly = (row: SubscriptionRow) => monthlyEquivalentCents(row.amount_cents, row.period_unit, row.period_count);

export const byMonthlyAmountDesc: RowComparator = (a, b) => monthly(b) - monthly(a) || byName(a, b);

/** Comparateur d'un tri. Les résiliés n'ont plus d'échéance : « prochain prélèvement » les laisse par ordre alphabétique. */
export function comparatorFor(sort: SubscriptionSort, cancelled = false): RowComparator {
  if (sort === 'monthly_amount') {
    return byMonthlyAmountDesc;
  }
  return sort === 'name' || cancelled ? byName : byNextDate;
}

/** Vrai si chaque mot de la recherche figure dans le nom ou la catégorie, sans tenir compte des accents ni de la casse. */
export function matchesQuery(row: Pick<SubscriptionRow, 'name' | 'category_name'>, query: string): boolean {
  const words = normalizeName(query).split(' ').filter(Boolean);
  const haystack = `${normalizeName(row.name)} ${normalizeName(row.category_name)}`;
  return words.every((word) => haystack.includes(word));
}

/** Message de l'état vide d'une recherche (espaces insécables dans les guillemets). */
export function noMatchMessage(query: string): string {
  return `Aucun abonnement ne correspond à « ${query} ».`;
}

export interface SubscriptionView {
  /** Recherche et tri affichés (assez d'abonnements). */
  toolsVisible: boolean;
  /** Recherche en cours, telle qu'appliquée (sans espaces autour) ; vide si aucune. */
  query: string;
  searching: boolean;
  groups: SubscriptionGroup[];
  cancelled: SubscriptionRow[];
  /** Recherche sans aucun résultat. */
  noMatch: boolean;
}

/** Liste de l'onglet : filtre puis tri à l'intérieur de chaque groupe. Sous le seuil, recherche et tri sont ignorés. */
export function buildSubscriptionView(
  rows: readonly SubscriptionRow[],
  options: { query: string; sort: SubscriptionSort },
): SubscriptionView {
  const toolsVisible = rows.length > SEARCH_SORT_THRESHOLD;
  const query = toolsVisible ? options.query.trim() : '';
  const sort = toolsVisible ? options.sort : DEFAULT_SORT;
  const searching = normalizeName(query) !== '';
  const kept = searching ? rows.filter((r) => matchesQuery(r, query)) : rows;
  return {
    toolsVisible,
    query,
    searching,
    groups: groupByStatus(kept, comparatorFor(sort)),
    cancelled: cancelledByName(kept, comparatorFor(sort, true)),
    noMatch: searching && kept.length === 0,
  };
}
