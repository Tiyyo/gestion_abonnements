import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { createSubscription } from '@/db/commands/create-subscription';
import { markPaydayDone } from '@/db/commands/mark-payday-done';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { rescheduleTransfer } from '@/db/commands/reschedule-transfer';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { undoPayday } from '@/db/commands/undo-payday';
import { undoTransferDone } from '@/db/commands/undo-transfer-done';
import { loadMonthPlan } from '@/db/repositories/plan/month-plan';
import type { DB } from './types';

// Les messages « Annuler » ne remplacent une confirmation que si la commande inverse rend exactement l'état d'avant.
let db: Kysely<DB>;
let spotify: string;
const today = '2026-11-17';

const monthly = (name: string, amountCents: number, firstChargeDate: string) =>
  createSubscription(db, { name, amountCents, periodUnit: 'month', periodCount: 1, status: 'active', firstChargeDate }, today, randomUUID);

/**
 * État métier complet, sans les horodatages techniques ni le journal d'événements.
 * `ids: false` ignore les identifiants des transferts : l'arrêt supprime les transferts devenus inutiles, son annulation les recrée.
 */
async function snapshot({ ids = true }: { ids?: boolean } = {}) {
  const subscriptions = await db
    .selectFrom('subscription')
    .select(['id', 'status', 'amount_cents', 'next_charge_date', 'period_end_date', 'cancel_done', 'trial_end_date'])
    .orderBy('id')
    .execute();
  const charges = await db
    .selectFrom('charge')
    .select(['subscription_id', 'due_date', 'expected_amount_cents', 'funded_amount_cents', 'status', 'provision_only'])
    .orderBy('subscription_id')
    .orderBy('due_date')
    .execute();
  const transfers = await db
    .selectFrom('transfer')
    .select(['id', 'type', 'planned_date', 'rescheduled_date', 'amount_cents', 'status', 'done_at'])
    .orderBy('planned_date')
    .orderBy('type')
    .execute();
  const links = await db
    .selectFrom('transfer_charge')
    .innerJoin('charge', 'charge.id', 'transfer_charge.charge_id')
    .select(['transfer_charge.transfer_id', 'charge.subscription_id', 'charge.due_date', 'transfer_charge.amount_cents'])
    .orderBy('transfer_charge.transfer_id')
    .orderBy('charge.subscription_id')
    .orderBy('charge.due_date')
    .execute();
  if (ids) {
    return { subscriptions, charges, transfers, links };
  }
  const key = new Map(transfers.map((t) => [t.id, `${t.type} ${t.planned_date}`]));
  return {
    subscriptions,
    charges,
    transfers: transfers.map((t) => ({ ...t, id: key.get(t.id) })),
    links: links
      .map((l) => ({ ...l, transfer_id: key.get(l.transfer_id) }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  };
}

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  await monthly('iCloud+', 299, '2026-11-19');
  spotify = await monthly('Spotify', 1199, '2026-11-21');
});

afterEach(async () => {
  await db.destroy();
});

describe('annulations proposées par les messages', () => {
  it('marquer un transfert fait puis annuler rend l’état d’avant', async () => {
    const before = await snapshot();
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    await markTransferDone(db, first!.id);
    expect(await snapshot()).not.toEqual(before);
    await undoTransferDone(db, first!.id, randomUUID);
    expect(await snapshot()).toEqual(before);
  });

  it('annuler un transfert fait conserve son report', async () => {
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    await rescheduleTransfer(db, first!.id, '2026-11-19');
    const before = await snapshot();
    await markTransferDone(db, first!.id);
    await undoTransferDone(db, first!.id, randomUUID);
    expect(await snapshot()).toEqual(before);
  });

  it('reporter puis remettre la date précédente rend l’état d’avant', async () => {
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    const before = await snapshot();
    await rescheduleTransfer(db, first!.id, '2026-11-19');
    await rescheduleTransfer(db, first!.id, null);
    expect(await snapshot()).toEqual(before);
  });

  it('le virement de paie renvoie son identifiant, et l’annuler rend l’état d’avant', async () => {
    await createSubscription(
      db,
      { name: 'Nom de domaine', amountCents: 5000, periodUnit: 'year', periodCount: 1, status: 'active', firstChargeDate: '2027-03-03' },
      today,
      randomUUID,
    );
    const before = await snapshot();
    const { period } = await loadMonthPlan(db, 2026, 11, today);
    const transferId = await markPaydayDone(db, period, randomUUID);
    expect(transferId).toEqual(expect.any(String));
    expect(await snapshot()).not.toEqual(before);
    expect(await markPaydayDone(db, period, randomUUID)).toBeNull();
    await undoPayday(db, transferId!);
    expect(await snapshot()).toEqual(before);
  });

  it('arrêter un abonnement puis annuler la décision rend l’état d’avant', async () => {
    const before = await snapshot({ ids: false });
    await transitionSubscription(db, spotify, { type: 'stop', periodEndDate: '2026-12-20' }, today, randomUUID);
    expect(await snapshot({ ids: false })).not.toEqual(before);
    await transitionSubscription(db, spotify, { type: 'undo_stop' }, today, randomUUID);
    expect(await snapshot({ ids: false })).toEqual(before);
  });

  it('arrêter puis annuler ne touche pas à un transfert déjà fait', async () => {
    const [first] = (await loadMonthPlan(db, 2026, 11, today)).transfers;
    await markTransferDone(db, first!.id);
    const before = await snapshot({ ids: false });
    await transitionSubscription(db, spotify, { type: 'stop', periodEndDate: '2026-11-20' }, today, randomUUID);
    await transitionSubscription(db, spotify, { type: 'undo_stop' }, today, randomUUID);
    expect(await snapshot({ ids: false })).toEqual(before);
  });
});
