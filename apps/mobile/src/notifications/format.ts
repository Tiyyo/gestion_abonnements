/** Délais de rappel des réglages (JSON), limités à des jours entiers entre 1 et 30. */
export function reminderDays(json: string): number[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n) && n > 0 && n <= 30) : [];
  } catch {
    return [];
  }
}
