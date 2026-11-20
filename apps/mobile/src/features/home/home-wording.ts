import { diffDays, formatEuros } from '@abonnements/core';
import type { HomeData, HomeReview, HomeUpcoming } from '@/db/repositories/home/types';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
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
  return `Prévu le ${dateShort(review.dueDate)} · ${review.wanted ? 'passé ou échoué ?' : 'non financé, a-t-il échoué ?'}`;
}

export function upcomingCaption(upcoming: HomeUpcoming): string {
  if (upcoming.funded) {
    return `Alimenté · ${formatEuros(upcoming.fundedAmountCents)}`;
  }
  return upcoming.transferDate
    ? `Transfert ${dateWithWeekday(upcoming.transferDate)} · ${formatEuros(upcoming.fundedAmountCents)}`
    : 'Pas de transfert prévu';
}

export function upcomingAccessibilityLabel(upcoming: HomeUpcoming): string {
  return `${upcoming.name}, prélevé le ${dateLong(upcoming.dueDate)}, ${formatEuros(upcoming.amountCents)}. Ouvrir la fiche`;
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** Montant encore à transférer : transferts en retard et prochain transfert. */
export function pendingTransfersCents(data: HomeData | undefined): number {
  return data ? data.overdue.reduce((sum, t) => sum + t.amountCents, 0) + (data.next?.amountCents ?? 0) : 0;
}
