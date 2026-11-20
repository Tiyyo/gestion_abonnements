import { dayOfWeek, formatEuros } from '@abonnements/core';
import type { PlanTrial } from '@/db/repositories/plan/types';
import { formatDayMonth } from '@/lib/format';
import type { CalendarDay } from './calendar-grid';
import type { DayItem, MarkerKind } from './calendar-items';

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « vendredi 27 novembre », « dimanche 1er novembre » : tables fixes, sans `Date` locale ni `Intl`. */
export function formatFullDay(date: string): string {
  const day = Number(date.slice(8, 10));
  return `${WEEKDAYS[dayOfWeek(date)]} ${day === 1 ? '1er' : day} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

/** Titre de la section du jour choisi : « Vendredi 27 novembre ». */
export function dayTitle(date: string): string {
  const label = formatFullDay(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const MARKER_LABELS: Record<MarkerKind, string> = {
  payday: 'Virement de paie',
  transfer_todo: 'Transfert à faire',
  transfer_done: 'Transfert fait',
  charge: 'Prélèvement',
  trial: 'Fin d’essai',
};

/** Sous-titre d'un prélèvement dans le détail du jour : le transfert qui le finance. */
export function chargeDayNote(charge: { fundedOn: string; funded: boolean }): string {
  return `${charge.funded ? 'Financé' : 'À financer'} par le transfert du ${formatDayMonth(charge.fundedOn)}`;
}

/** Sous-titre d'une fin d'essai : jamais financée, elle passe seulement si le compte a de quoi ce jour-là. */
export function trialDayNote(trial: Pick<PlanTrial, 'risk' | 'projectedCents'>): string {
  return trial.risk
    ? `Fin d’essai non financée : pourrait passer, le compte aura environ ${formatEuros(trial.projectedCents)}.`
    : 'Fin d’essai non financée : échouera faute de solde.';
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Résumé parlé des éléments d'un jour : « 1 transfert à faire, 2 prélèvements », ou « rien de prévu ». */
export function dayItemsSummary(items: readonly DayItem[]): string {
  const count = (test: (item: DayItem) => boolean) => items.filter(test).length;
  const groups: [number, string, string][] = [
    [count((i) => i.kind === 'payday'), 'virement de paie', 'virements de paie'],
    [count((i) => i.kind === 'transfer' && !i.transfer.done), 'transfert à faire', 'transferts à faire'],
    [count((i) => i.kind === 'transfer' && i.transfer.done), 'transfert fait', 'transferts faits'],
    [count((i) => i.kind === 'charge'), 'prélèvement', 'prélèvements'],
    [count((i) => i.kind === 'trial'), 'fin d’essai', 'fins d’essai'],
  ];
  const spoken = groups.filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
  return spoken.length > 0 ? spoken.join(', ') : 'rien de prévu';
}

/** Libellé d'accessibilité d'une case : « vendredi 27 novembre, 1 transfert à faire, 1 prélèvement ». */
export function dayAccessibilityLabel(day: Pick<CalendarDay, 'date' | 'holiday'>, items: readonly DayItem[], today: string): string {
  return [formatFullDay(day.date), day.date === today ? 'aujourd’hui' : null, day.holiday ? 'jour férié' : null, dayItemsSummary(items)]
    .filter((part) => part !== null)
    .join(', ');
}
