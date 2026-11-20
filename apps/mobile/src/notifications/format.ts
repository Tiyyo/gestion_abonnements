import { parts } from '@abonnements/core';

const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

/** « 5 déc » : date courte des notifications. */
export function shortDate(date: string): string {
  const { day, month } = parts(date);
  return `${day} ${MONTHS[month - 1]}`;
}

/** Délais de rappel des réglages (JSON), limités à des jours entiers entre 1 et 30. */
export function reminderDays(json: string): number[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n) && n > 0 && n <= 30) : [];
  } catch {
    return [];
  }
}

export function inDays(days: number): string {
  return days === 1 ? 'demain' : `dans ${days} jours`;
}
