import { addDays, compareDates, daysInMonth, formatEuros, paydayDate, parts } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NotificationKind } from '../db/types';
import { computePayday, loadVaultTransfers } from '../db/repositories/plan';
import type { DB } from '../db/types';

export const WINDOW_DAYS = 60;

export interface PlannedNotification {
  kind: NotificationKind;
  refId: string;
  fireAt: string;
  title: string;
  body: string;
  url: string;
}

const short = (date: string) => {
  const { day, month } = parts(date);
  return `${day} ${['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'][month - 1]}`;
};

function reminderDays(json: string): number[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n) && n > 0 && n <= 30) : [];
  } catch {
    return [];
  }
}

function inDays(days: number): string {
  return days === 1 ? 'demain' : `dans ${days} jours`;
}

export async function planNotifications(db: Kysely<DB>, now: { date: string; time: string }): Promise<PlannedNotification[]> {
  const settings = await db.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const time = settings.notif_time;
  const at = (date: string) => `${date}T${time}`;
  const end = addDays(now.date, WINDOW_DAYS);
  const nowKey = `${now.date}T${now.time}`;
  const result: PlannedNotification[] = [];
  const push = (n: PlannedNotification) => {
    if (n.fireAt > nowKey && compareDates(n.fireAt.slice(0, 10), end) <= 0) {
      result.push(n);
    }
  };

  const transfers = await loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned');
  for (const t of transfers) {
    const names = t.charges.map((c) => c.name).join(', ');
    const due = t.charges.map((c) => c.dueDate).sort(compareDates)[0];
    push({
      kind: 'funding',
      refId: t.id,
      fireAt: at(t.effectiveDate),
      title: `Transfert à faire : ${formatEuros(t.amountCents)}`,
      body: `Coffre → compte principal pour ${names}${due ? ` (prélevé le ${short(due)})` : ''}.`,
      url: '/',
    });
  }

  const subs = await db.selectFrom('subscription').selectAll().where('archived_at', 'is', null).where('status', 'in', ['trial', 'to_cancel']).execute();
  for (const sub of subs) {
    if (sub.status === 'trial' && sub.trial_end_date) {
      for (const n of reminderDays(settings.trial_reminder_days)) {
        push({
          kind: 'trial_end',
          refId: sub.id,
          fireAt: at(addDays(sub.trial_end_date, -n)),
          title: `Fin d’essai ${sub.name} ${inDays(n)}`,
          body: `Sans décision, le prélèvement de ${formatEuros(sub.amount_cents)} du ${short(sub.trial_end_date)} échouera. Garde-le ou résilie-le.`,
          url: `/subscriptions/${sub.id}`,
        });
      }
      push({
        kind: 'trial_end',
        refId: sub.id,
        fireAt: at(addDays(sub.trial_end_date, 1)),
        title: `${sub.name} : le prélèvement est-il passé ?`,
        body: 'L’essai est terminé. Indique si le prélèvement est passé ou a échoué.',
        url: '/',
      });
    }
    if (sub.status === 'to_cancel' && sub.period_end_date && sub.cancel_done === 0) {
      for (const n of reminderDays(settings.cancel_reminder_days)) {
        push({
          kind: 'cancel_end',
          refId: sub.id,
          fireAt: at(addDays(sub.period_end_date, -n)),
          title: `Résilier ${sub.name} ${inDays(n)}`,
          body: `La période se termine le ${short(sub.period_end_date)}. Pense à résilier chez le marchand.`,
          url: `/subscriptions/${sub.id}`,
        });
      }
      push({
        kind: 'cancel_end',
        refId: sub.id,
        fireAt: at(addDays(sub.period_end_date, 1)),
        title: `As-tu bien résilié ${sub.name} ?`,
        body: 'La période est terminée. Confirme la résiliation pour clore l’abonnement.',
        url: '/',
      });
    }
  }

  const { year, month } = parts(now.date);
  for (let i = 0; i <= 2; i += 1) {
    const index = year * 12 + (month - 1) + i;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    const nextIndex = index + 1;
    const start = paydayDate(y, m, settings.payday_day);
    const period = { start, end: paydayDate(Math.floor(nextIndex / 12), (nextIndex % 12) + 1, settings.payday_day) };
    const done = await db.selectFrom('transfer').select('id').where('type', '=', 'payday').where('planned_date', '=', start).executeTakeFirst();
    if (!done) {
      const { totalCents } = await computePayday(db, period);
      push({
        kind: 'payday',
        refId: `payday:${start}`,
        fireAt: at(start),
        title: `Virement de paie : ${formatEuros(totalCents)}`,
        body: 'Banque → Revolut → coffre. Marque-le fait dans le Plan.',
        url: '/plan',
      });
    }
    const last = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
    push({
      kind: 'residual',
      refId: `residual:${y}-${String(m).padStart(2, '0')}`,
      fireAt: at(last),
      title: 'Résidu du mois',
      body: 'Vérifie le résidu estimé et renvoie-le au coffre.',
      url: '/plan',
    });
  }

  return result.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}

export async function overdueReminder(db: Kysely<DB>, today: string): Promise<PlannedNotification | null> {
  const settings = await db.selectFrom('settings').select('global_margin_bp').executeTakeFirstOrThrow();
  const overdue = await loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned' && compareDates(t.effective, today) < 0);
  if (overdue.length === 0) {
    return null;
  }
  const total = overdue.reduce((sum, t) => sum + t.amountCents, 0);
  return {
    kind: 'funding',
    refId: `overdue:${today}`,
    fireAt: today,
    title: overdue.length === 1 ? 'Un transfert est en retard' : `${overdue.length} transferts sont en retard`,
    body: `${formatEuros(total)} à transférer du coffre vers le compte principal.`,
    url: '/',
  };
}
