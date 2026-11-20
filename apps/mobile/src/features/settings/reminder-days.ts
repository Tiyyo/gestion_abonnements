/** Jours de rappel proposés avant une fin d'essai ou de période, du plus tôt au plus tard. */
export const REMINDER_DAY_OPTIONS = [7, 3, 1] as const;

export function parseDays(json: string): number[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function reminderLabel(days: number[]): string {
  return days.length === 0 ? 'Aucun' : days.map((d) => `J-${d}`).join(' et ');
}

/** Ajoute ou retire un jour de rappel, la liste restant triée du plus tôt au plus tard. */
export function toggleReminderDay(days: number[], day: number): number[] {
  return (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]).sort((a, b) => b - a);
}
