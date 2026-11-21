export interface PendingPriceChange {
  id: string;
  payload: Record<string, unknown>;
}

/**
 * Écart constaté au rapprochement et pas encore reporté sur l'abonnement (`applied: false`) pour ce montant.
 * `events` : événements `price_change` de l'abonnement, du plus récent au plus ancien.
 */
export function pendingPriceChange(events: readonly { id: string; payload: string }[], amountCents: number): PendingPriceChange | null {
  for (const event of events) {
    const payload = JSON.parse(event.payload) as Record<string, unknown>;
    if (payload.applied === false && payload.to === amountCents) {
      return { id: event.id, payload };
    }
  }
  return null;
}
