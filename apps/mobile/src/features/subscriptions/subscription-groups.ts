import { effectiveMarginBp, formatEuros, fundedAmountCents, type SubscriptionStatus } from '@abonnements/core';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { dateShort } from '@/lib/dates';
import { monthlyProvisionCents } from './funding';

export const GROUPS: readonly { status: Exclude<SubscriptionStatus, 'cancelled'>; title: string; dot: string }[] = [
  { status: 'to_cancel', title: 'À résilier', dot: 'dangerText' },
  { status: 'trial', title: 'En essai', dot: 'warnText' },
  { status: 'active', title: 'Actifs', dot: 'okText' },
];

export type SubscriptionGroup = (typeof GROUPS)[number] & { rows: SubscriptionRow[] };

export function byNextDate(a: SubscriptionRow, b: SubscriptionRow): number {
  return a.next_charge_date.localeCompare(b.next_charge_date) || a.name.localeCompare(b.name, 'fr');
}

export type RowComparator = (a: SubscriptionRow, b: SubscriptionRow) => number;

export const byName: RowComparator = (a, b) => a.name.localeCompare(b.name, 'fr');

/** Groupes non vides dans l'ordre d'urgence (à résilier, essais, actifs), chacun trié (par défaut : prochaine échéance). */
export function groupByStatus(rows: readonly SubscriptionRow[], compare: RowComparator = byNextDate): SubscriptionGroup[] {
  return GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => r.status === g.status).sort(compare) })).filter((g) => g.rows.length > 0);
}

/** Abonnements résiliés, triés (par défaut : ordre alphabétique). */
export function cancelledByName(rows: readonly SubscriptionRow[], compare: RowComparator = byName): SubscriptionRow[] {
  return rows.filter((r) => r.status === 'cancelled').sort(compare);
}

/** Suffixe de périodicité court : « / mois », « / 3 mois », « / 2 ans ». */
export function periodSuffix(row: Pick<SubscriptionRow, 'period_unit' | 'period_count'>): string {
  const { period_unit: unit, period_count: count } = row;
  const label = unit === 'week' ? 'sem.' : unit === 'month' ? 'mois' : 'an';
  return count === 1 ? `/ ${label}` : `/ ${count} ${unit === 'year' ? 'ans' : label}`;
}

export function lineSubtitle(row: SubscriptionRow, globalMarginBp: number): string {
  switch (row.status) {
    case 'trial':
      return `fin d’essai ${dateShort(row.trial_end_date ?? row.next_charge_date)}`;
    case 'to_cancel':
      return `fin de période ${dateShort(row.period_end_date ?? row.next_charge_date)}`;
    case 'cancelled':
      return 'résilié';
    case 'active': {
      const next = `prochain le ${dateShort(row.next_charge_date)}`;
      const funded = fundedAmountCents(row.amount_cents, effectiveMarginBp(row.margin_override_bp, globalMarginBp));
      const provision = monthlyProvisionCents(funded, row.period_unit, row.period_count);
      return provision === null ? next : `${next}, provisionné ${formatEuros(provision)}/mois`;
    }
  }
}
