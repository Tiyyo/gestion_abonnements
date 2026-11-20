import { addDays, dayOfWeek, daysInMonth, isPublicHoliday, isWeekend, makeDate } from '@abonnements/core';

/** Une case de la grille : un jour du mois affiché, ou un jour du mois voisin qui complète la semaine. */
export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  weekend: boolean;
  holiday: boolean;
}

/** Initiales des jours, semaine commençant le lundi. */
export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** Vrai si la date `YYYY-MM-DD` tombe dans le mois (1 à 12) donné. */
export function isInMonth(date: string, year: number, month: number): boolean {
  return date.slice(0, 7) === makeDate(year, month, 1).slice(0, 7);
}

/**
 * Semaines (lundi → dimanche) qui couvrent le mois : 4 à 6 lignes de 7 jours.
 * Tout le calcul passe par les dates `YYYY-MM-DD` de `core` (UTC), sans fuseau local.
 */
export function monthMatrix(year: number, month: number): CalendarDay[][] {
  const first = makeDate(year, month, 1);
  const lead = (dayOfWeek(first) + 6) % 7;
  const weekCount = Math.ceil((lead + daysInMonth(year, month)) / 7);
  const start = addDays(first, -lead);
  return Array.from({ length: weekCount }, (_week, week) =>
    Array.from({ length: 7 }, (_column, column) => {
      const date = addDays(start, week * 7 + column);
      return {
        date,
        day: Number(date.slice(8, 10)),
        inMonth: isInMonth(date, year, month),
        weekend: isWeekend(date),
        holiday: isPublicHoliday(date),
      };
    }),
  );
}
