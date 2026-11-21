import { diffDays, formatEuros, priceChangeBp } from '@abonnements/core';
import type { HomeData, HomePriceAlert, HomeReview, HomeUpcoming } from '@/db/repositories/home/types';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import { formatSignedEuros, formatSignedPercentBp } from '@/features/subscriptions/price-history';
import { dateLong, dateShort, dateWithWeekday, relativeDay } from '@/lib/dates';

/** Date du jour en surtitre de l'en-tête, par exemple « vendredi 20 novembre ». */
export function heroDateLabel(today: string): string {
  return dateLong(today);
}

export function transferPurpose(transfer: PlanTransfer): string {
  const names = transfer.charges.map((c) => c.name).join(', ');
  const due = transfer.charges.map((c) => `le ${dateShort(c.dueDate)}`).join(', ');
  return `Coffre → compte principal, pour ${names} (prélevé ${due})`;
}

export function whenLabel(date: string, today: string): string {
  const days = diffDays(today, date);
  return days === 0 || days === 1 ? `${relativeDay(days)} ${dateShort(date)}` : dateWithWeekday(date);
}

export function trialEndLabel(dueDate: string, today: string): string {
  const days = diffDays(today, dueDate);
  return `fin ${relativeDay(Math.max(0, days))}`;
}

export function trialBody(trial: PlanTrial): string {
  return trial.risk
    ? `${formatEuros(trial.amountCents)} ensuite. Attention : le compte aura environ ${formatEuros(trial.projectedCents)} ce jour-là, le prélèvement pourrait passer.`
    : `${formatEuros(trial.amountCents)} ensuite. Non financé : le prélèvement échouera si tu ne fais rien.`;
}

export function reviewCaption(review: HomeReview): string {
  if (review.bank?.kind === 'debit') {
    return `Débit de ${formatEuros(review.bank.amountCents)} vu le ${dateShort(review.bank.date)} · à confirmer`;
  }
  if (review.bank?.kind === 'no_debit') {
    return `Prévu le ${dateShort(review.dueDate)} · aucun débit vu, échoué ?`;
  }
  return `Prévu le ${dateShort(review.dueDate)} · ${review.wanted ? 'passé ou échoué ?' : 'non financé, a-t-il échoué ?'}`;
}

/** « Spotify : +1,00 € (+8,3 %) ». */
export function priceAlertTitle(alert: HomePriceAlert): string {
  const bp = priceChangeBp(alert.fromCents, alert.toCents);
  const delta = formatSignedEuros(alert.toCents - alert.fromCents);
  return `${alert.name} : ${delta}${bp === null ? '' : ` (${formatSignedPercentBp(bp)})`}`;
}

export function priceAlertBody(alert: HomePriceAlert): string {
  return `Passé de ${formatEuros(alert.fromCents)} à ${formatEuros(alert.toCents)} le ${dateShort(alert.occurredOn)}, soit ${formatSignedEuros(alert.annualImpactCents)} par an.`;
}

export function upcomingCaption(upcoming: HomeUpcoming): string {
  if (upcoming.funded) {
    return `Alimenté · ${formatEuros(upcoming.fundedAmountCents)}`;
  }
  return upcoming.transferDate
    ? `Transfert ${dateWithWeekday(upcoming.transferDate)} · ${formatEuros(upcoming.fundedAmountCents)}`
    : 'Pas de transfert prévu';
}

/** Les « · » de mise en page deviennent des virgules : TalkBack les lirait « point » ou les sauterait sans pause. */
export function spoken(text: string): string {
  return text.replaceAll(' · ', ', ');
}

export function upcomingAccessibilityLabel(upcoming: HomeUpcoming): string {
  return `${upcoming.name}, prélevé le ${dateLong(upcoming.dueDate)}, ${formatEuros(upcoming.amountCents)}. ${spoken(upcomingCaption(upcoming))}`;
}

export function reviewAccessibilityLabel(review: HomeReview): string {
  return `${review.name}, ${formatEuros(review.expectedAmountCents)}. ${spoken(reviewCaption(review))}`;
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** Montant encore à transférer : transferts en retard et prochain transfert. */
export function pendingTransfersCents(data: HomeData | undefined): number {
  return data ? data.overdue.reduce((sum, t) => sum + t.amountCents, 0) + (data.next?.amountCents ?? 0) : 0;
}
