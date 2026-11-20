import { dateOfTimestamp, dateShort } from '@/lib/dates';

export const RENEWAL_NOTICE_DAYS = 14;

export function daysUntil(isoDateTime: string, now: Date): number {
  return Math.floor((new Date(isoDateTime).getTime() - now.getTime()) / 86_400_000);
}

export function vaultShortfallCents(vaultCents: number, pendingTransfersCents: number): number {
  return Math.max(0, pendingTransfersCents - vaultCents);
}

/** Fraîcheur des soldes affichée dans la pastille d'actualisation. */
export function freshness(fetchedAt: string, now: Date): string {
  const at = new Date(fetchedAt);
  if (now.getTime() - at.getTime() < 60_000) {
    return 'à l’instant';
  }
  const time = at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return at.toDateString() === now.toDateString() ? `à ${time}` : `le ${dateShort(dateOfTimestamp(fetchedAt))} à ${time}`;
}
