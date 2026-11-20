import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { archiveSubscription } from '@/db/commands/archive-subscription';
import { createSubscription } from '@/db/commands/create-subscription';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { updateSubscription } from '@/db/commands/update-subscription';
import { correctionsRepository, subscriptionsRepository } from '@/db/repositories/subscriptions';
import type { DB } from './types';

let db: Kysely<DB>;
const today = '2026-11-17';

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
});

afterEach(async () => {
  await db.destroy();
});

const monthly = (name: string, amountCents: number, firstChargeDate: string) =>
  createSubscription(db, { name, amountCents, periodUnit: 'month', periodCount: 1, status: 'active', firstChargeDate }, today, randomUUID);

describe('createSubscription', () => {
  it('crée l’abonnement, son événement de création et 13 mois de prélèvements', async () => {
    const id = await monthly('Spotify', 1199, '2026-11-21');

    const row = await subscriptionsRepository(db).get(id);
    expect(row).toMatchObject({ name: 'Spotify', anchor_day: 21, category_name: 'Autre', status: 'active' });

    const charges = await db.selectFrom('charge').selectAll().where('subscription_id', '=', id).orderBy('due_date').execute();
    expect(charges).toHaveLength(13);
    expect(charges[0]).toMatchObject({ due_date: '2026-11-21', expected_amount_cents: 1199, funded_amount_cents: 1235, status: 'planned' });

    const events = await db.selectFrom('event').selectAll().where('subscription_id', '=', id).execute();
    expect(events.map((e) => [e.type, JSON.parse(e.payload)])).toEqual([['status_change', { from: null, to: 'active' }]]);
  });

  it('crée un essai avec une seule charge de conversion non financée', async () => {
    const id = await createSubscription(
      db,
      { name: 'Disney+', amountCents: 999, periodUnit: 'month', periodCount: 1, status: 'trial', firstChargeDate: '2026-11-20' },
      today,
      randomUUID,
    );
    const charges = await db.selectFrom('charge').selectAll().where('subscription_id', '=', id).execute();
    expect(charges).toEqual([
      expect.objectContaining({ due_date: '2026-11-20', status: 'unfunded', funded_amount_cents: 0, is_trial_conversion: 1 }),
    ]);
    expect(await subscriptionsRepository(db).get(id)).toMatchObject({ trial_end_date: '2026-11-20', post_trial_amount_cents: 999 });
  });

  it('regroupe les transferts des maquettes de novembre', async () => {
    await monthly('iCloud+', 299, '2026-11-19');
    await monthly('Spotify', 1199, '2026-11-21');
    await monthly('Netflix', 1349, '2026-11-24');
    await createSubscription(
      db,
      { name: 'Disney+', amountCents: 999, periodUnit: 'month', periodCount: 1, status: 'trial', firstChargeDate: '2026-11-20' },
      today,
      randomUUID,
    );

    const november = await db
      .selectFrom('transfer')
      .select(['planned_date', 'amount_cents'])
      .where('type', '=', 'vault_to_main')
      .where('planned_date', '<', '2026-12-01')
      .orderBy('planned_date')
      .execute();
    expect(november).toEqual([
      { planned_date: '2026-11-18', amount_cents: 308 },
      { planned_date: '2026-11-20', amount_cents: 1235 },
      { planned_date: '2026-11-23', amount_cents: 1390 },
    ]);

    const upcoming = await db
      .selectFrom('v_upcoming_charge')
      .selectAll()
      .where('due_date', '<', '2026-11-25')
      .orderBy('due_date')
      .execute();
    expect(upcoming.map((c) => [c.name, c.transfer_date])).toEqual([
      ['iCloud+', '2026-11-18'],
      ['Disney+', null],
      ['Spotify', '2026-11-20'],
      ['Netflix', '2026-11-23'],
    ]);
  });

  it('garde les mêmes transferts quand on relance la synchronisation', async () => {
    await monthly('Spotify', 1199, '2026-11-21');
    const before = await db.selectFrom('transfer').select('id').orderBy('planned_date').execute();
    await monthly('Netflix', 1349, '2026-11-24');
    const after = await db.selectFrom('transfer').select('id').orderBy('planned_date').execute();
    expect(after.map((t) => t.id)).toEqual(expect.arrayContaining(before.map((t) => t.id)));
  });
});

describe('transitionSubscription', () => {
  const trial = () =>
    createSubscription(
      db,
      { name: 'Disney+', amountCents: 999, periodUnit: 'month', periodCount: 1, status: 'trial', firstChargeDate: '2026-11-20' },
      today,
      randomUUID,
    );
  const chargesOf = (id: string) =>
    db
      .selectFrom('charge')
      .select(['id', 'due_date', 'status', 'funded_amount_cents'])
      .where('subscription_id', '=', id)
      .orderBy('due_date')
      .execute();

  it('garder un essai finance ses prélèvements en gardant la charge de conversion', async () => {
    const id = await trial();
    const [conversion] = await chargesOf(id);
    await transitionSubscription(db, id, { type: 'keep_trial' }, today, randomUUID);

    const charges = await chargesOf(id);
    expect(charges).toHaveLength(13);
    expect(charges[0]).toEqual({ id: conversion?.id, due_date: '2026-11-20', status: 'planned', funded_amount_cents: 1029 });
    const transfer = await db.selectFrom('transfer').selectAll().where('planned_date', '=', '2026-11-19').executeTakeFirst();
    expect(transfer?.amount_cents).toBe(1029);
  });

  it('résilier un essai supprime sa charge et trace le changement', async () => {
    const id = await trial();
    await transitionSubscription(db, id, { type: 'cancel_trial' }, today, randomUUID);
    expect(await chargesOf(id)).toEqual([]);
    const events = await db.selectFrom('event').select('payload').where('subscription_id', '=', id).orderBy('created_at').execute();
    expect(events.map((e) => JSON.parse(e.payload))).toContainEqual({ from: 'trial', to: 'cancelled' });
  });

  it('arrêter un abonnement ne finance plus rien après la fin de période', async () => {
    const id = await monthly('Spotify', 1199, '2026-11-21');
    await transitionSubscription(db, id, { type: 'stop', periodEndDate: '2026-12-20' }, today, randomUUID);
    const charges = await chargesOf(id);
    expect(charges.slice(0, 2).map((c) => c.status)).toEqual(['planned', 'unfunded']);
    const transfers = await db.selectFrom('transfer').select('planned_date').execute();
    expect(transfers.map((t) => t.planned_date)).toEqual(['2026-11-20']);
  });

  it('garde l’ancrage au 31 quand on arrête un abonnement prélevé fin février', async () => {
    const id = await createSubscription(
      db,
      { name: 'Banque', amountCents: 500, periodUnit: 'month', periodCount: 1, status: 'active', firstChargeDate: '2026-12-31' },
      today,
      randomUUID,
    );
    await db.updateTable('subscription').set({ next_charge_date: '2027-02-28' }).where('id', '=', id).execute();
    await transitionSubscription(db, id, { type: 'stop', periodEndDate: '2027-04-30' }, today, randomUUID);
    const row = await subscriptionsRepository(db).get(id);
    expect(row?.anchor_day).toBe(31);
    const dates = (await chargesOf(id)).map((c) => c.due_date);
    expect(dates).toContain('2027-03-31');
  });

  it('archiver retire les prélèvements prévus et les transferts', async () => {
    const id = await monthly('Spotify', 1199, '2026-11-21');
    await archiveSubscription(db, id, today, randomUUID);
    expect(await chargesOf(id)).toEqual([]);
    expect(await db.selectFrom('transfer').selectAll().execute()).toEqual([]);
    expect(await subscriptionsRepository(db).get(id)).toBeUndefined();
  });
});

describe('updateSubscription', () => {
  it('modifie le montant : prix tracé, prélèvements prévus recalculés, prélèvement déjà alimenté inchangé', async () => {
    const id = await monthly('Spotify', 1199, '2026-11-21');
    const [first] = await db.selectFrom('transfer').select('id').orderBy('planned_date').execute();
    await markTransferDone(db, first!.id);
    await updateSubscription(
      db,
      id,
      {
        name: 'Spotify',
        amountCents: 1299,
        periodUnit: 'month',
        periodCount: 1,
        date: '2026-11-21',
        categoryId: 'cat-musique',
        iconKey: 'spotify',
      },
      today,
      randomUUID,
      { correction: { categoryId: 'cat-musique', iconKey: 'spotify' } },
    );
    const charges = await db
      .selectFrom('charge')
      .select(['due_date', 'status', 'funded_amount_cents'])
      .where('subscription_id', '=', id)
      .orderBy('due_date')
      .execute();
    expect(charges[0]).toEqual({ due_date: '2026-11-21', status: 'funded', funded_amount_cents: 1235 });
    expect(charges[1]).toEqual({ due_date: '2026-12-21', status: 'planned', funded_amount_cents: 1338 });
    expect(await subscriptionsRepository(db).get(id)).toMatchObject({ category_name: 'Musique', icon_key: 'spotify' });
    const events = await db.selectFrom('event').select('payload').where('type', '=', 'price_change').execute();
    expect(events.map((e) => JSON.parse(e.payload))).toEqual([{ from: 1199, to: 1299 }]);
    expect(await correctionsRepository(db).find('  SPOTIFY ')).toMatchObject({ category_id: 'cat-musique', icon_key: 'spotify' });
  });

  it('change la date : nouvel ancrage et prélèvements déplacés', async () => {
    const id = await monthly('Netflix', 1349, '2026-11-24');
    await updateSubscription(
      db,
      id,
      { name: 'Netflix', amountCents: 1349, periodUnit: 'month', periodCount: 1, date: '2026-11-30' },
      today,
      randomUUID,
    );
    expect(await subscriptionsRepository(db).get(id)).toMatchObject({ anchor_day: 30, next_charge_date: '2026-11-30' });
    const dates = (await db.selectFrom('charge').select('due_date').where('subscription_id', '=', id).orderBy('due_date').execute()).map(
      (c) => c.due_date,
    );
    expect(dates.slice(0, 4)).toEqual(['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']);
  });

  it('passer en « autre moyen de paiement » retire les transferts', async () => {
    const id = await monthly('Spotify', 1199, '2026-11-21');
    await updateSubscription(
      db,
      id,
      { name: 'Spotify', amountCents: 1199, periodUnit: 'month', periodCount: 1, date: '2026-11-21', paymentMethod: 'other' },
      today,
      randomUUID,
    );
    expect(await db.selectFrom('transfer').selectAll().execute()).toEqual([]);
  });
});
