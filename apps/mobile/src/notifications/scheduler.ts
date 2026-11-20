import { setNotificationHandler } from 'expo-notifications';
import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import { rescheduleNow } from './reschedule';

setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let db: Kysely<DB> | null = null;
let chain: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;

export function attachNotificationDb(database: Kysely<DB>): void {
  db = database;
}

/** Replanification différée et sérialisée : plusieurs demandes rapprochées n'en déclenchent qu'une. */
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
