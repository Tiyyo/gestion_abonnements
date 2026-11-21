import { parsePriceChange, priceAlertActive } from '@abonnements/core';
import { annualCents } from '@/db/repositories/stats';
import type { Subscription } from '@/db/types';
import type { HomePriceAlert } from './types';

export interface PriceChangeEventRow {
  id: string;
  subscription_id: string | null;
  occurred_on: string;
  payload: string;
}

/**
 * Alertes « Hausse de prix » : pour chaque abonnement actif, le dernier changement de prix appliqué, s'il s'agit
 * d'une hausse non masquée de moins de 30 jours. `events` : événements `price_change`, du plus ancien au plus récent.
 */
export function priceAlerts(subs: readonly Subscription[], events: readonly PriceChangeEventRow[], today: string): HomePriceAlert[] {
  const latest = new Map<string, { event: PriceChangeEventRow; change: NonNullable<ReturnType<typeof parsePriceChange>> }>();
  for (const event of events) {
    const change = parsePriceChange(event.payload);
    if (event.subscription_id && change?.applied) {
      latest.set(event.subscription_id, { event, change });
    }
  }
  const alerts: HomePriceAlert[] = [];
  for (const sub of subs) {
    const last = latest.get(sub.id);
    if (sub.status !== 'active' || !last || !priceAlertActive(last.change, last.event.occurred_on, today)) {
      continue;
    }
    const { from, to } = last.change;
    alerts.push({
      eventId: last.event.id,
      subscriptionId: sub.id,
      name: sub.name,
      fromCents: from,
      toCents: to,
      occurredOn: last.event.occurred_on,
      annualImpactCents: annualCents(to, sub.period_unit, sub.period_count) - annualCents(from, sub.period_unit, sub.period_count),
      nextChargeDate: sub.next_charge_date,
    });
  }
  return alerts.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || a.name.localeCompare(b.name));
}
