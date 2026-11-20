import { todayIn } from '@abonnements/core';
import { cancelAllScheduledNotificationsAsync, SchedulableTriggerInputTypes, scheduleNotificationAsync } from 'expo-notifications';
import type { Kysely } from 'kysely';
import { newId } from '@/db/id';
import { scheduledNotificationsRepository } from '@/db/repositories/scheduled-notifications';
import type { DB } from '@/db/types';
import { CHANNEL_ID, ensureChannel } from './channel';
import { overdueReminder } from './overdue-reminder';
import { notificationsAllowed } from './permissions';
import { planNotifications } from './plan-notifications';
import type { PlannedNotification } from './types';

function nowParts(): { date: string; time: string } {
  const now = new Date();
  return { date: todayIn(), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
}

async function schedule(n: PlannedNotification): Promise<string> {
  return scheduleNotificationAsync({
    content: { title: n.title, body: n.body, data: { url: n.url } },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(`${n.fireAt}:00`), channelId: CHANNEL_ID },
  });
}

/** Annule puis replanifie toutes les notifications locales à partir de l'état de la base. */
export async function rescheduleNow(database: Kysely<DB>): Promise<void> {
  if (!(await notificationsAllowed())) {
    return;
  }
  await ensureChannel();
  const now = nowParts();
  const nowKey = `${now.date}T${now.time}`;
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
