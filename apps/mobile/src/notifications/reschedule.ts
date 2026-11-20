import { cancelAllScheduledNotificationsAsync, SchedulableTriggerInputTypes, scheduleNotificationAsync } from 'expo-notifications';
import type { Kysely } from 'kysely';
import { newId } from '@/db/id';
import { scheduledNotificationsRepository } from '@/db/repositories/scheduled-notifications';
import type { DB } from '@/db/types';
import { ensureCategories } from './categories';
import { CHANNEL_ID, ensureChannel } from './channel';
import { overdueReminder } from './overdue-reminder';
import { nowParts } from './now-parts';
import { notificationsAllowed } from './permissions';
import { planNotifications } from './plan-notifications';
import type { PlannedNotification } from './types';

async function schedule(n: PlannedNotification): Promise<string> {
  return scheduleNotificationAsync({
    content: { title: n.title, body: n.body, data: { ...n.data, url: n.url }, categoryIdentifier: n.categoryId },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(`${n.fireAt}:00`), channelId: CHANNEL_ID },
  });
}

/** Annule puis replanifie toutes les notifications locales à partir de l'état de la base. */
export async function rescheduleNow(database: Kysely<DB>): Promise<void> {
  if (!(await notificationsAllowed())) {
    return;
  }
  await ensureChannel();
  // Sans catégorie (échec de déclaration), la notification reste un simple rappel qui ouvre l'app.
  await ensureCategories().catch(() => undefined);
  const now = nowParts();
  const nowKey = now.key;
  const scheduled = scheduledNotificationsRepository(database, newId);

  await cancelAllScheduledNotificationsAsync();
  await scheduled.purge(nowKey, now.date);

  // Rappels coupés dans les Réglages : tout est annulé ci-dessus, rien n'est replanifié.
  if (!(await scheduled.remindersEnabled())) {
    return;
  }

  for (const n of await planNotifications(database, now)) {
    const osId = await schedule(n);
    await scheduled.recordIfNew({ kind: n.kind, refId: n.refId, fireAt: n.fireAt, osNotificationId: osId });
  }

  const overdue = await overdueReminder(database, now.date);
  if (overdue && !(await scheduled.exists('funding', overdue.refId))) {
    await scheduleNotificationAsync({
      content: { title: overdue.title, body: overdue.body, data: { url: overdue.url } },
      trigger: null,
    });
    await scheduled.record({ kind: 'funding', refId: overdue.refId, fireAt: nowKey, osNotificationId: null });
  }
}
