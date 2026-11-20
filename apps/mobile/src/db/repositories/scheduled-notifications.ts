import { addMonthsAnchored } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import type { DB, NotificationKind } from '@/db/types';

/** Historique conservé des notifications déjà déclenchées, en mois. */
const PURGE_MONTHS = 13;

export interface ScheduledNotificationRecord {
  kind: NotificationKind;
  refId: string;
  fireAt: string;
  osNotificationId: string | null;
}

export function scheduledNotificationsRepository(db: Kysely<DB>, newId: NewId) {
  return {
    /** Oublie les notifications à venir (elles vont être replanifiées) et l'historique trop ancien. */
    async purge(nowKey: string, today: string): Promise<void> {
      await db.deleteFrom('scheduled_notification').where('fire_at', '>', nowKey).execute();
      await db
        .deleteFrom('scheduled_notification')
        .where('fire_at', '<', addMonthsAnchored(today, -PURGE_MONTHS, 1))
        .execute();
    },
    /** Enregistre une notification planifiée ; un doublon (même rappel déjà connu) est ignoré. */
    async recordIfNew(n: ScheduledNotificationRecord): Promise<void> {
      await db
        .insertInto('scheduled_notification')
        .values({ id: newId(), kind: n.kind, ref_id: n.refId, fire_at: n.fireAt, os_notification_id: n.osNotificationId })
        .onConflict((oc) => oc.doNothing())
        .execute();
    },
    async record(n: ScheduledNotificationRecord): Promise<void> {
      await db
        .insertInto('scheduled_notification')
        .values({ id: newId(), kind: n.kind, ref_id: n.refId, fire_at: n.fireAt, os_notification_id: n.osNotificationId })
        .execute();
    },
    async exists(kind: NotificationKind, refId: string): Promise<boolean> {
      const row = await db
        .selectFrom('scheduled_notification')
        .select('id')
        .where('kind', '=', kind)
        .where('ref_id', '=', refId)
        .executeTakeFirst();
      return row !== undefined;
    },
    /** Rappels coupés dans les Réglages : faux seulement si l'interrupteur est explicitement à 0. */
    async remindersEnabled(): Promise<boolean> {
      const settings = await db.selectFrom('settings').select('reminders_enabled').where('id', '=', 1).executeTakeFirst();
      return settings?.reminders_enabled !== 0;
    },
  };
}
