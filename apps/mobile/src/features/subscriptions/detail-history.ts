export interface HistoryEventSource {
  id: string;
  occurred_on: string;
  created_at: string;
}

export interface HistoryReminderSource {
  id: string;
  fire_at: string;
}

export type HistoryItem<E, R> =
  | { id: string; date: string; sort: string; kind: 'event'; event: E }
  | { id: string; date: string; sort: string; kind: 'reminder'; reminder: R };

/**
 * Fusionne événements et rappels déjà envoyés (`fire_at <= now`, `now` au format `YYYY-MM-DDTHH:MM`),
 * du plus récent au plus ancien ; à date égale, l'horodatage le plus récent d'abord.
 */
export function buildHistory<E extends HistoryEventSource, R extends HistoryReminderSource>(
  events: readonly E[],
  reminders: readonly R[],
  now: string,
): HistoryItem<E, R>[] {
  return [
    ...events.map((e) => ({ id: e.id, date: e.occurred_on, sort: e.created_at, kind: 'event' as const, event: e })),
    ...reminders
      .filter((r) => r.fire_at <= now)
      .map((r) => ({ id: r.id, date: r.fire_at.slice(0, 10), sort: r.fire_at, kind: 'reminder' as const, reminder: r })),
  ].sort((a, b) => (a.date === b.date ? b.sort.localeCompare(a.sort) : b.date.localeCompare(a.date)));
}

/** Provisions financées depuis le dernier prélèvement payé (toutes si aucun n'a encore été payé). */
export function provisionedSince(
  provisions: readonly { due_date: string; funded_amount_cents: number }[],
  lastPaidDate: string | null,
): number {
  return provisions.filter((p) => !lastPaidDate || p.due_date > lastPaidDate).reduce((total, p) => total + p.funded_amount_cents, 0);
}
