import { diffDays, type IsoDate } from './calendar';

/** D'où vient le changement : montant modifié à la main, ou écart constaté au rapprochement d'un prélèvement. */
export type PriceChangeSource = 'manual' | 'reconciliation';

/** Durée d'affichage de l'alerte « Hausse de prix » sur l'Accueil, en jours après le changement. */
export const PRICE_ALERT_DAYS = 30;

export interface PriceChange {
  from: number;
  to: number;
  source: PriceChangeSource;
  /** Faux tant que l'écart constaté n'a pas été reporté sur le montant de l'abonnement. */
  applied: boolean;
  chargeId: string | null;
  dismissedAt: string | null;
}

/** Charge utile d'un événement `price_change` à l'écriture. */
export function priceChangePayload(
  from: number,
  to: number,
  source: PriceChangeSource,
  applied: boolean,
  chargeId?: string,
): Record<string, unknown> {
  return chargeId === undefined ? { from, to, source, applied } : { chargeId, from, to, source, applied };
}

const isCents = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/**
 * Lit la charge utile d'un événement `price_change`. Les événements enregistrés avant le 20/11/2026 n'ont ni `source` ni `applied` :
 * la source se déduit de `chargeId`, et ils comptent comme appliqués. Renvoie `null` si les montants sont illisibles ou égaux.
 */
export function parsePriceChange(payloadJson: string): PriceChange | null {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object' || !isCents(raw.from) || !isCents(raw.to) || raw.from === raw.to) {
    return null;
  }
  const chargeId = typeof raw.chargeId === 'string' ? raw.chargeId : null;
  return {
    from: raw.from,
    to: raw.to,
    source: raw.source === 'manual' || raw.source === 'reconciliation' ? raw.source : chargeId ? 'reconciliation' : 'manual',
    applied: raw.applied !== false,
    chargeId,
    dismissedAt: typeof raw.dismissedAt === 'string' ? raw.dismissedAt : null,
  };
}

/** Hausse réelle du prix de l'abonnement (un écart ponctuel non reporté n'en est pas une). */
export function isPriceIncrease(change: PriceChange): boolean {
  return change.applied && change.to > change.from;
}

/** L'alerte reste affichée tant qu'elle n'est pas masquée, pendant `PRICE_ALERT_DAYS` jours à partir du changement. */
export function priceAlertActive(change: PriceChange, occurredOn: IsoDate, today: IsoDate): boolean {
  const age = diffDays(occurredOn, today);
  return isPriceIncrease(change) && change.dismissedAt === null && age >= 0 && age < PRICE_ALERT_DAYS;
}

/** Variation en points de base, arrondie au dixième de pour cent ; `null` si l'ancien prix était nul. */
export function priceChangeBp(from: number, to: number): number | null {
  return from > 0 ? Math.round(((to - from) * 1000) / from) * 10 : null;
}
