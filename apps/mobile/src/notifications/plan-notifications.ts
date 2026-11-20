import { addDays, compareDates, parts } from '@abonnements/core';
import type { Kysely } from 'kysely';
import { computePayday } from '@/db/repositories/plan/compute-payday';
import { findPaydayTransfer } from '@/db/repositories/plan/payday-transfer';
import { periodForMonth, shiftMonth } from '@/db/repositories/plan/period';
import { loadVaultTransfers } from '@/db/repositories/plan/vault-transfers';
import { settingsRepository } from '@/db/repositories/settings';
import { subscriptionsAwaitingDecision } from '@/db/repositories/subscriptions';
import type { DB, Settings } from '@/db/types';
import { reminderDays } from './format';
import { paydayReminder, residualReminder } from './month-reminders';
import { cancelReminders, trialReminders } from './subscription-reminders';
import { fundingReminder } from './transfer-reminders';
import type { FireAt, PlannedNotification } from './types';

export const WINDOW_DAYS = 60;
const MONTHS_AHEAD = 2;

async function subscriptionReminders(db: Kysely<DB>, settings: Settings, at: FireAt): Promise<PlannedNotification[]> {
  const subs = await subscriptionsAwaitingDecision(db);
  return subs.flatMap((sub) => [
    ...(sub.status === 'trial' && sub.trial_end_date
      ? trialReminders(sub, sub.trial_end_date, reminderDays(settings.trial_reminder_days), at)
      : []),
    ...(sub.status === 'to_cancel' && sub.period_end_date && sub.cancel_done === 0
      ? cancelReminders(sub, sub.period_end_date, reminderDays(settings.cancel_reminder_days), at)
      : []),
  ]);
}

/** Virement de paie (s'il n'est pas encore fait) et résidu, pour le mois courant et les deux suivants. */
async function monthReminders(db: Kysely<DB>, settings: Settings, today: string, at: FireAt): Promise<PlannedNotification[]> {
  const result: PlannedNotification[] = [];
  const { year, month } = parts(today);
  for (let i = 0; i <= MONTHS_AHEAD; i += 1) {
    const [y, m] = shiftMonth(year, month, i);
    const period = periodForMonth(y, m, settings.payday_day);
    if (!(await findPaydayTransfer(db, period.start))) {
      const { totalCents } = await computePayday(db, period);
      result.push(paydayReminder(period.start, totalCents, at));
    }
    result.push(residualReminder(y, m, at));
  }
  return result;
}

export async function planNotifications(db: Kysely<DB>, now: { date: string; time: string }): Promise<PlannedNotification[]> {
  const settings = await settingsRepository(db).get();
  const at: FireAt = (date) => `${date}T${settings.notif_time}`;
  const end = addDays(now.date, WINDOW_DAYS);
  const nowKey = `${now.date}T${now.time}`;

  const transfers = await loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned');
  const candidates = [
    ...transfers.map((t) => fundingReminder(t, at)),
    ...(await subscriptionReminders(db, settings, at)),
    ...(await monthReminders(db, settings, now.date, at)),
  ];
  return candidates
    .filter((n) => n.fireAt > nowKey && compareDates(n.fireAt.slice(0, 10), end) <= 0)
    .sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}
