import { addMonthsAnchored, todayIn } from '@abonnements/core';
import * as Notifications from 'expo-notifications';
import type { Kysely } from 'kysely';
import { Platform } from 'react-native';
import { newId } from '../db/id';
import type { DB } from '../db/types';
import { overdueReminder, planNotifications, type PlannedNotification } from './plan';

export const CHANNEL_ID = 'rappels';
const PURGE_MONTHS = 13;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let db: Kysely<DB> | null = null;
let chain: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;

function nowParts(): { date: string; time: string } {
  const now = new Date();
  return { date: todayIn(), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function notificationsAllowed(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function requestNotifications(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function schedule(n: PlannedNotification): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title: n.title, body: n.body, data: { url: n.url } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(`${n.fireAt}:00`), channelId: CHANNEL_ID },
  });
}

async function rescheduleNow(database: Kysely<DB>): Promise<void> {
  if (!(await notificationsAllowed())) {
    return;
  }
  await ensureChannel();
  const now = nowParts();
  const nowKey = `${now.date}T${now.time}`;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await database.deleteFrom('scheduled_notification').where('fire_at', '>', nowKey).execute();
  await database.deleteFrom('scheduled_notification').where('fire_at', '<', addMonthsAnchored(now.date, -PURGE_MONTHS, 1)).execute();

  for (const n of await planNotifications(database, now)) {
    const osId = await schedule(n);
    await database
      .insertInto('scheduled_notification')
      .values({ id: newId(), kind: n.kind, ref_id: n.refId, fire_at: n.fireAt, os_notification_id: osId })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  const overdue = await overdueReminder(database, now.date);
  if (overdue) {
    const already = await database
      .selectFrom('scheduled_notification')
      .select('id')
      .where('kind', '=', 'funding')
      .where('ref_id', '=', overdue.refId)
      .executeTakeFirst();
    if (!already) {
      await Notifications.scheduleNotificationAsync({
        content: { title: overdue.title, body: overdue.body, data: { url: overdue.url } },
        trigger: null,
      });
      await database
        .insertInto('scheduled_notification')
        .values({ id: newId(), kind: 'funding', ref_id: overdue.refId, fire_at: nowKey, os_notification_id: null })
        .execute();
    }
  }
}

export function attachNotificationDb(database: Kysely<DB>): void {
  db = database;
}

export function requestReschedule(delayMs = 400): void {
  if (!db) {
    return;
  }
  const database = db;
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    chain = chain.then(() => rescheduleNow(database)).catch(() => undefined);
  }, delayMs);
}
