import { daysInMonth, paydayDate, type PaydayPeriod } from '@abonnements/core';

export function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}

/** Période de paie qui commence le jour de paie du mois donné et s'achève à celui du mois suivant. */
export function periodForMonth(year: number, month: number, paydayDay: number): PaydayPeriod {
  const [ny, nm] = shiftMonth(year, month, 1);
  return { start: paydayDate(year, month, paydayDay), end: paydayDate(ny, nm, paydayDay) };
}

/** Clé `YYYY-MM` d'un mois. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Dernier jour du mois, au format `YYYY-MM-DD`. */
export function lastDayOfMonth(year: number, month: number): string {
  return `${monthKey(year, month)}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
}
