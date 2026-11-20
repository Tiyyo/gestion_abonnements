import { todayIn } from '@abonnements/core';

/** Date (Europe/Paris) et heure locale courantes ; `key` est l'instant `YYYY-MM-DDTHH:mm` des notifications. */
export function nowParts(): { date: string; time: string; key: string } {
  const now = new Date();
  const date = todayIn();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { date, time, key: `${date}T${time}` };
}
