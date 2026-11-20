import { diffDays, formatEuros } from '@abonnements/core';
import type { HomeData, HomeReview, HomeUpcoming } from '@/db/repositories/home/types';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import { formatDayMonth, formatWeekdayDayMonth } from '@/lib/format';

const MONTHS_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

/** Date du jour en surtitre de l'en-tête, par exemple « jeudi 20 novembre ». */
export function heroDateLabel(today: string): string {
  return new Date(`${today}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function transferPurpose(transfer: PlanTransfer): string {
  const names = transfer.charges.map((c) => c.name).join(', ');
  const due = transfer.charges.map((c) => `le ${dayOfMonth(c.dueDate)}`).join(', ');
  return `Coffre → compte principal, pour ${names} (prélevé ${due})`;
}

export function whenLabel(date: string, today: string): string {
  const days = diffDays(today, date);
  if (days === 0) {
    return `aujourd’hui ${formatDayMonth(date)}`;
  }
  if (days === 1) {
    return `demain ${formatDayMonth(date)}`;
  }
  return formatWeekdayDayMonth(date);
}

export function trialEndLabel(dueDate: string, today: string): string {
  const days = diffDays(today, dueDate);
  return days > 1 ? `fin dans ${days} jours` : days === 1 ? 'fin demain' : 'fin aujourd’hui';
}

export function trialBody(trial: PlanTrial): string {
  return trial.risk
    ? `${formatEuros(trial.amountCents)} ensuite. Attention : le compte aura environ ${formatEuros(trial.projectedCents)} ce jour-là, le prélèvement pourrait passer.`
    : `${formatEuros(trial.amountCents)} ensuite. Non financé : le prélèvement échouera si tu ne fais rien.`;
}

export function reviewCaption(review: HomeReview): string {
  return `Prévu le ${formatDayMonth(review.dueDate)} · ${review.wanted ? 'passé ou échoué ?' : 'non financé, a-t-il échoué ?'}`;
}

export function upcomingCaption(upcoming: HomeUpcoming): string {
  if (upcoming.funded) {
    return `Alimenté · ${formatEuros(upcoming.fundedAmountCents)}`;
  }
  return upcoming.transferDate
    ? `Transfert ${formatWeekdayDayMonth(upcoming.transferDate).toLowerCase()} · ${formatEuros(upcoming.fundedAmountCents)}`
    : 'Pas de transfert prévu';
}

export function upcomingAccessibilityLabel(upcoming: HomeUpcoming): string {
  return `${upcoming.name}, prélevé le ${formatDayMonth(upcoming.dueDate)}, ${formatEuros(upcoming.amountCents)}. Ouvrir la fiche`;
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function monthShort(date: string): string {
  return MONTHS_SHORT[Number(date.slice(5, 7)) - 1] ?? '';
}

/** Montant encore à transférer : transferts en retard et prochain transfert. */
export function pendingTransfersCents(data: HomeData | undefined): number {
  return data ? data.overdue.reduce((sum, t) => sum + t.amountCents, 0) + (data.next?.amountCents ?? 0) : 0;
}
