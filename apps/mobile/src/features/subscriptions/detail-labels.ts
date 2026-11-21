import { formatEuros, suggestedPeriodEnd } from '@abonnements/core';
import { dateShort, relativeDay } from '@/lib/dates';
import { formatPercentBp } from '@/lib/format';

/** Échéance relative d'une fin d'essai à `days` jours. */
export function trialWhenLabel(days: number): string {
  return days < 0 ? 'passée' : relativeDay(days);
}

export function trialNoticeText(trialRisk: boolean, amountCents: number, trialEndDate: string): string {
  return trialRisk
    ? `Attention : le compte aura assez d’argent ce jour-là, le prélèvement de ${formatEuros(amountCents)} du ${dateShort(trialEndDate)} pourrait passer. Décide avant.`
    : `Non financé : sans décision de ta part, le prélèvement de ${formatEuros(amountCents)} du ${dateShort(trialEndDate)} échouera.`;
}

export function toCancelNoticeText(cancelDone: boolean): string {
  return cancelDone
    ? 'Résiliation confirmée : l’abonnement passera en résilié après cette date.'
    : 'Les prélèvements suivants ne sont plus financés. Pense à résilier chez le marchand.';
}

export function transferLabel(nextCharge: { transfer_date: string | null; funded_amount_cents: number } | null): string {
  return nextCharge?.transfer_date ? `${dateShort(nextCharge.transfer_date)} · ${formatEuros(nextCharge.funded_amount_cents)}` : 'Aucun';
}

export function appliedMarginLabel(marginBp: number, overrideBp: number | null): string {
  return `${formatPercentBp(marginBp)}${overrideBp === null ? ' (globale)' : ''}`;
}

export function paymentMethodLabel(method: string): string {
  return method === 'revolut' ? 'Revolut' : 'Autre (non financé)';
}

/** Fin de période proposée à l'arrêt : la veille du prochain prélèvement, jamais dans le passé. */
export function defaultStopDate(nextChargeDate: string, today: string): string {
  const end = suggestedPeriodEnd(nextChargeDate);
  return end < today ? today : end;
}

/** Message affiché après « Arrêter » (l'action « Annuler » du message revient à l'abonnement actif). */
export function stopToastLabel(periodEndDate: string): string {
  return `Arrêt prévu le ${dateShort(periodEndDate)}`;
}
