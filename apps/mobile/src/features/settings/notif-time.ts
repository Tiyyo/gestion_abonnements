/** Heure des rappels (`HH:MM`) en date locale pour le sélecteur, 09:00 à défaut. */
export function notifTimeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 0, 1, h ?? 9, m ?? 0);
}

export function formatNotifTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
