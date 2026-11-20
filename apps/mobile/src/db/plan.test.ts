import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { createSubscription } from '@/db/commands/create-subscription';
import { markPaydayDone } from '@/db/commands/mark-payday-done';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { rescheduleTransfer } from '@/db/commands/reschedule-transfer';
import { undoPayday } from '@/db/commands/undo-payday';
import { undoTransferDone } from '@/db/commands/undo-transfer-done';
import { loadMonthPlan } from '@/db/repositories/plan/month-plan';
import type { NewSubscriptionInput } from '@/db/repositories/subscriptions';
import type { DB } from './types';

let db: Kysely<DB>;
const today = '2026-11-17';

const add = (input: Partial<NewSubscriptionInput> & Pick<NewSubscriptionInput, 'name' | 'amountCents' | 'firstChargeDate'>) =>
  createSubscription(db, { periodUnit: 'month', periodCount: 1, status: 'active', ...input }, today, randomUUID);

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  await add({ name: 'iCloud+', amountCents: 299, firstChargeDate: '2026-11-19' });
  await add({ name: 'Spotify', amountCents: 1199, firstChargeDate: '2026-11-21' });
  await add({ name: 'Netflix', amountCents: 1349, firstChargeDate: '2026-11-24' });
  await add({ name: 'Disney+', amountCents: 999, firstChargeDate: '2026-11-20', status: 'trial' });
  await add({ name: 'Nom de domaine', amountCents: 5000, firstChargeDate: '2027-03-03', periodUnit: 'year' });
});

afterEach(async () => {
  await db.destroy();
});

describe('loadMonthPlan', () => {
  it('reproduit le plan de novembre des maquettes', async () => {
    const plan = await loadMonthPlan(db, 2026, 11, today);

    expect(plan.period).toEqual({ start: '2026-11-02', end: '2026-12-01' });
    expect(plan.payday).toMatchObject({ done: false, totalCents: 3363 });
    expect(plan.payday.lines).toEqual([
      { kind: 'charges', subscriptionId: null, name: null, amountCents: 2933 },
      expect.objectContaining({ kind: 'provision', name: 'Nom de domaine', amountCents: 430 }),
    ]);
    expect(plan.transfers.map((t) => [t.effectiveDate, t.amountCents, t.charges.map((c) => c.name)])).toEqual([
      ['2026-11-18', 308, ['iCloud+']],
      ['2026-11-20', 1235, ['Spotify']],
      ['2026-11-23', 1390, ['Netflix']],
    ]);
    expect(plan.trials).toEqual([
      { subscriptionId: expect.any(String), name: 'Disney+', dueDate: '2026-11-20', amountCents: 999, risk: true, projectedCents: 1235 },
    ]);
    expect(plan.residualCents).toBe(0);
  });

  it('lève le risque quand le transfert du même jour est reporté après la fin d’essai', async () => {
    const spotify = (await loadMonthPlan(db, 2026, 11, today)).transfers[1];
    await rescheduleTransfer(db, spotify!.id, '2026-11-21');
    const after = await loadMonthPlan(db, 2026, 11, today);
    expect(after.trials[0]).toMatchObject({ risk: false, projectedCents: 0 });
  });
});

describe('transferts', () => {
  it('marquer fait finance les prélèvements, annuler les remet en prévu', async () => {
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    await markTransferDone(db, first!.id);

    const funded = await db.selectFrom('charge').select('status').where('due_date', '=', '2026-11-19').executeTakeFirstOrThrow();
    expect(funded.status).toBe('funded');
    expect((await loadMonthPlan(db, 2026, 11, today)).transfers[0]).toMatchObject({ id: first!.id, done: true });

    await undoTransferDone(db, first!.id, randomUUID);
    const back = await loadMonthPlan(db, 2026, 11, today);
    expect(back.transfers[0]).toMatchObject({ id: first!.id, done: false, amountCents: 308 });
  });

  it('reporter change la date effective sans changer la date calculée', async () => {
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    await rescheduleTransfer(db, first!.id, '2026-11-19');
    const [moved] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    expect(moved).toMatchObject({ plannedDate: '2026-11-18', effectiveDate: '2026-11-19', rescheduled: true });
  });
});

describe('virement de paie', () => {
  it('fige le montant, crée la provision et la cumule le mois suivant', async () => {
    const november = await loadMonthPlan(db, 2026, 11, today);
    await markPaydayDone(db, november.period, randomUUID);

    const done = await loadMonthPlan(db, 2026, 11, today);
    expect(done.payday).toMatchObject({ done: true, totalCents: 3363 });
    expect(done.payday.lines.map((l) => l.amountCents)).toEqual([2933, 430]);

    const december = await loadMonthPlan(db, 2026, 12, today);
    expect(december.payday.lines.find((l) => l.kind === 'provision')?.amountCents).toBe(430);

    await undoPayday(db, done.payday.transferId!);
    expect(await db.selectFrom('charge').selectAll().where('provision_only', '=', 1).execute()).toEqual([]);
    expect((await loadMonthPlan(db, 2026, 11, today)).payday.done).toBe(false);
  });

  it('ne demande que le complément le mois du prélèvement annuel', async () => {
    for (const [y, m] of [
      [2026, 11],
      [2026, 12],
      [2027, 1],
      [2027, 2],
    ] as const) {
      await markPaydayDone(db, (await loadMonthPlan(db, y, m, today)).period, randomUUID);
    }
    const march = await loadMonthPlan(db, 2027, 3, today);
    expect(march.payday.lines.find((l) => l.name === 'Nom de domaine')).toMatchObject({ kind: 'complement', amountCents: 5150 - 4 * 430 });
  });
});
