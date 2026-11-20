import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from '@/db/client';
import { createSubscription } from '@/db/commands/create-subscription';
import { markPaydayDone } from '@/db/commands/mark-payday-done';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { confirmCancellation } from '@/db/reconcile/confirm-cancellation';
import { loadMonthPlan } from '@/db/repositories/plan/month-plan';
import type { DB } from '@/db/types';
import { overdueReminder } from './overdue-reminder';
import { planNotifications } from './plan-notifications';

let db: Kysely<DB>;
const today = '2026-11-17';
const now = { date: today, time: '10:00' };

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
});

afterEach(async () => {
  await db.destroy();
});

const add = (name: string, amountCents: number, firstChargeDate: string, status: 'trial' | 'active' = 'active') =>
  createSubscription(db, { name, amountCents, periodUnit: 'month', periodCount: 1, status, firstChargeDate }, today, randomUUID);

describe('planNotifications', () => {
  it('planifie les transferts à l’heure des rappels, sur 60 jours', async () => {
    await add('Spotify', 1199, '2026-11-21');
    const funding = (await planNotifications(db, now)).filter((n) => n.kind === 'funding');
    expect(funding.map((n) => n.fireAt)).toEqual(['2026-11-20T09:00', '2026-12-18T09:00']);
    expect(funding[0]).toMatchObject({
      title: 'Transfert à faire : 12,35\u202f€',
      body: 'Coffre → compte principal pour Spotify (prélevé le 21\u00a0nov.).',
    });
  });

  it('n’envoie plus rien pour un transfert fait', async () => {
    await add('Spotify', 1199, '2026-11-21');
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    await markTransferDone(db, first!.id);
    expect((await planNotifications(db, now)).filter((n) => n.kind === 'funding').map((n) => n.fireAt)).toEqual(['2026-12-18T09:00']);
  });

  it('rappelle la fin d’essai à J-3 et J-1, puis pose la question à J+1', async () => {
    await add('Disney+', 999, '2026-11-25', 'trial');
    const trial = (await planNotifications(db, now)).filter((n) => n.kind === 'trial_end');
    expect(trial.map((n) => [n.fireAt, n.title])).toEqual([
      ['2026-11-22T09:00', 'Fin d’essai Disney+ dans 3\u00a0jours'],
      ['2026-11-24T09:00', 'Fin d’essai Disney+ demain'],
      ['2026-11-26T09:00', 'Disney+ : le prélèvement est-il passé ?'],
    ]);
  });

  it('ignore les rappels déjà passés', async () => {
    await add('Disney+', 999, '2026-11-19', 'trial');
    const trial = (await planNotifications(db, now)).filter((n) => n.kind === 'trial_end');
    expect(trial.map((n) => n.fireAt)).toEqual(['2026-11-18T09:00', '2026-11-20T09:00']);
  });

  it('rappelle la résiliation, puis plus rien une fois confirmée', async () => {
    const id = await add('Netflix', 1349, '2026-11-24');
    await transitionSubscription(db, id, { type: 'stop', periodEndDate: '2026-12-23' }, today, randomUUID);
    expect((await planNotifications(db, now)).filter((n) => n.kind === 'cancel_end').map((n) => n.fireAt)).toEqual([
      '2026-12-20T09:00',
      '2026-12-22T09:00',
      '2026-12-24T09:00',
    ]);
    await confirmCancellation(db, id, today, randomUUID);
    expect((await planNotifications(db, now)).filter((n) => n.kind === 'cancel_end')).toEqual([]);
  });

  it('annonce le virement de paie tant qu’il n’est pas fait, et le résidu en fin de mois', async () => {
    await add('Spotify', 1199, '2026-11-21');
    const before = await planNotifications(db, now);
    expect(before.filter((n) => n.kind === 'payday').map((n) => [n.fireAt, n.title])).toEqual([
      ['2026-12-01T09:00', 'Virement de paie : 12,35\u202f€'],
      ['2027-01-04T09:00', 'Virement de paie : 12,35\u202f€'],
    ]);
    expect(before.filter((n) => n.kind === 'residual').map((n) => n.refId)).toEqual(['residual:2026-11', 'residual:2026-12']);
    await markPaydayDone(db, (await loadMonthPlan(db, 2026, 12, today)).period, randomUUID);
    expect((await planNotifications(db, now)).filter((n) => n.kind === 'payday').map((n) => n.fireAt)).toEqual(['2027-01-04T09:00']);
  });

  it('suit les réglages : heure et jours de rappel', async () => {
    await db.updateTable('settings').set({ notif_time: '18:30', trial_reminder_days: '[7]' }).execute();
    await add('Disney+', 999, '2026-12-10', 'trial');
    const trial = (await planNotifications(db, now)).filter((n) => n.kind === 'trial_end');
    expect(trial.map((n) => n.fireAt)).toEqual(['2026-12-03T18:30', '2026-12-11T18:30']);
  });
});

describe('overdueReminder', () => {
  it('signale les transferts en retard', async () => {
    await add('Spotify', 1199, '2026-11-21');
    expect(await overdueReminder(db, today)).toBeNull();
    expect(await overdueReminder(db, '2026-11-21')).toMatchObject({ refId: 'overdue:2026-11-21', title: 'Un transfert est en retard' });
  });
});
