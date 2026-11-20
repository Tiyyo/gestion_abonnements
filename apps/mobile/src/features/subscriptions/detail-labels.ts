import { formatEuros, type PeriodUnit, suggestedPeriodEnd } from '@abonnements/core';
import { formatDayMonth, formatPercentBp } from '@/lib/format';

const PERIOD_LABELS: Record<string, string> = { week: 'semaine', month: 'mois', year: 'an' };

/** Montant et rythme : « 9,99 € / mois », « 59,00 € / 2 ans ». */
export function rhythmLabel(amountCents: number, unit: PeriodUnit, count: number): string {
  return `${formatEuros(amountCents)} / ${count > 1 ? `${count} ` : ''}${PERIOD_LABELS[unit]}${unit === 'year' && count > 1 ? 's' : ''}`;
}

/** Date longue avec jour de la semaine, capitalisée : « Ven. 20 nov. 2026 ». */
export function longDate(date: string): string {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Échéance relative d'une fin d'essai à `days` jours. */
export function trialWhenLabel(days: number): string {
  return days > 1 ? `dans ${days} jours` : days === 1 ? 'demain' : days === 0 ? 'aujourd’hui' : 'passée';
}

export function trialNoticeText(trialRisk: boolean, amountCents: number, trialEndDate: string): string {
  return trialRisk
    ? `Attention : le compte aura assez d’argent ce jour-là, le prélèvement de ${formatEuros(amountCents)} du ${formatDayMonth(trialEndDate)} pourrait passer. Décide avant.`
    : `Non financé : sans décision de ta part, le prélèvement de ${formatEuros(amountCents)} du ${formatDayMonth(trialEndDate)} échouera.`;
}

export function toCancelNoticeText(cancelDone: boolean): string {
  return cancelDone
    ? 'Résiliation confirmée : l’abonnement passera en résilié après cette date.'
    : 'Les prélèvements suivants ne sont plus financés. Pense à résilier chez le marchand.';
}

export function transferLabel(nextCharge: { transfer_date: string | null; funded_amount_cents: number } | null): string {
  return nextCharge?.transfer_date
    ? `${formatDayMonth(nextCharge.transfer_date)} · ${formatEuros(nextCharge.funded_amount_cents)}`
    : 'Aucun';
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
