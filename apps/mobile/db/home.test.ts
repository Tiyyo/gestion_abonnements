import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { createSubscription, markTransferDone, transitionSubscription } from './commands';
import { estimatedBalance } from '@abonnements/core';
import { classifyDebit, confirmCancellation, correctiveTransfer, decideAfterPaidTrial, recordUnknownDebit, reviewCharge, runDailyMaintenance, updateSubscriptionAmount } from './reconcile';
import { loadLedger } from './repositories/ledger';
import { loadHome } from './repositories/home';
import { subscriptionsRepository } from './repositories/subscriptions';
import type { NewSubscriptionInput } from './repositories/subscriptions';
import type { DB } from './types';

let db: Kysely<DB>;
const created = '2026-11-17';

const add = (input: Partial<NewSubscriptionInput> & Pick<NewSubscriptionInput, 'name' | 'amountCents' | 'firstChargeDate'>) =>
  createSubscription(db, { periodUnit: 'month', periodCount: 1, status: 'active', ...input }, created, randomUUID);

const chargeOf = (subscriptionId: string, dueDate: string) =>
  db.selectFrom('charge').selectAll().where('subscription_id', '=', subscriptionId).where('due_date', '=', dueDate).executeTakeFirstOrThrow();

let icloud: string;
let spotify: string;
let disney: string;

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  icloud = await add({ name: 'iCloud+', amountCents: 299, firstChargeDate: '2026-11-19' });
  spotify = await add({ name: 'Spotify', amountCents: 1199, firstChargeDate: '2026-11-21' });
  disney = await add({ name: 'Disney+', amountCents: 999, firstChargeDate: '2026-11-20', status: 'trial' });
});

afterEach(async () => {
  await db.destroy();
});

describe('loadHome', () => {
  it('montre le prochain transfert, l’essai à décider et les prochains prélèvements', async () => {
    const home = await loadHome(db, created);
    expect(home.overdue).toEqual([]);
    expect(home.next).toMatchObject({ effectiveDate: '2026-11-18', amountCents: 308 });
    expect(home.trials.map((t) => t.name)).toEqual(['Disney+']);
    expect(home.questions).toEqual([]);
    expect(home.toReview).toEqual([]);
    expect(home.upcoming.map((u) => [u.name, u.dueDate, u.transferDate])).toEqual([
      ['iCloud+', '2026-11-19', '2026-11-18'],
      ['Spotify', '2026-11-21', '2026-11-20'],
      ['iCloud+', '2026-12-19', '2026-12-18'],
    ]);
  });

  it('signale les transferts en retard, la question de fin d’essai et les prélèvements à vérifier', async () => {
    const home = await loadHome(db, '2026-11-21');
    expect(home.overdue.map((t) => t.effectiveDate)).toEqual(['2026-11-18', '2026-11-20']);
    expect(home.questions).toEqual([expect.objectContaining({ kind: 'trial_outcome', name: 'Disney+', amountCents: 999 })]);
    expect(home.toReview.map((r) => r.name)).toEqual(['iCloud+']);
    expect(home.trials).toEqual([]);
  });
});

describe('rapprochement', () => {
  it('passé au bon montant : la charge est payée et sort de « À vérifier »', async () => {
    const charge = await chargeOf(icloud, '2026-11-19');
    const result = await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 299, date: '2026-11-19' }, '2026-11-21', randomUUID);
    expect(result).toMatchObject({ proposeAmountUpdate: false, trialDecision: false });
    expect(await chargeOf(icloud, '2026-11-19')).toMatchObject({ status: 'paid', actual_amount_cents: 299 });
    expect((await loadHome(db, '2026-11-21')).toReview).toEqual([]);
  });

  it('passé à un autre montant : propose la mise à jour, qui recalcule les prélèvements suivants', async () => {
    const charge = await chargeOf(icloud, '2026-11-19');
    const result = await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 349, date: '2026-11-19' }, '2026-11-21', randomUUID);
    expect(result.proposeAmountUpdate).toBe(true);
    await updateSubscriptionAmount(db, icloud, 349, '2026-11-21', randomUUID);
    expect(await chargeOf(icloud, '2026-12-19')).toMatchObject({ expected_amount_cents: 349, funded_amount_cents: 360 });
  });

  it('échoué, le marchand va retenter : la charge revient trois jours plus tard', async () => {
    const charge = await chargeOf(icloud, '2026-11-19');
    await reviewCharge(db, charge.id, { kind: 'failed', choice: 'merchant_will_retry' }, '2026-11-21', randomUUID);
    expect((await loadHome(db, '2026-11-23')).toReview.map((r) => r.name)).not.toContain('iCloud+');
    expect((await loadHome(db, '2026-11-24')).toReview.map((r) => r.name)).toContain('iCloud+');
  });

  it('échoué, abandon : la charge passe en échec', async () => {
    const { next } = await loadHome(db, created);
    await markTransferDone(db, next!.id);
    const charge = await chargeOf(icloud, '2026-11-19');
    await reviewCharge(db, charge.id, { kind: 'failed', choice: 'give_up' }, '2026-11-21', randomUUID);
    expect(await chargeOf(icloud, '2026-11-19')).toMatchObject({ status: 'failed' });
    const events = await db.selectFrom('event').select('type').where('subscription_id', '=', icloud).execute();
    expect(events.map((e) => e.type)).toContain('charge_failed');
  });
});

describe('questions du lendemain', () => {
  it('essai échoué comme prévu : abonnement résilié', async () => {
    const { questions } = await loadHome(db, '2026-11-21');
    await reviewCharge(db, questions[0]!.chargeId!, { kind: 'failed', choice: 'give_up' }, '2026-11-21', randomUUID);
    expect(await subscriptionsRepository(db).get(disney)).toMatchObject({ status: 'cancelled' });
    expect(await chargeOf(disney, '2026-11-20')).toMatchObject({ status: 'failed' });
    expect((await loadHome(db, '2026-11-21')).questions).toEqual([]);
  });

  it('essai passé puis gardé : actif, prochain prélèvement le 20 décembre', async () => {
    const { questions } = await loadHome(db, '2026-11-21');
    const result = await reviewCharge(db, questions[0]!.chargeId!, { kind: 'paid', amountCents: 999, date: '2026-11-20' }, '2026-11-21', randomUUID);
    expect(result.trialDecision).toBe(true);
    await decideAfterPaidTrial(db, disney, 'keep', '2026-11-21', randomUUID);
    expect(await subscriptionsRepository(db).get(disney)).toMatchObject({ status: 'active', next_charge_date: '2026-12-20', anchor_day: 20 });
    expect(await chargeOf(disney, '2026-11-20')).toMatchObject({ status: 'paid' });
    expect(await chargeOf(disney, '2026-12-20')).toMatchObject({ status: 'planned', funded_amount_cents: 1029 });
  });

  it('essai passé puis résilié : à résilier jusqu’à la veille du prochain prélèvement', async () => {
    const { questions } = await loadHome(db, '2026-11-21');
    await reviewCharge(db, questions[0]!.chargeId!, { kind: 'paid', amountCents: 999, date: '2026-11-20' }, '2026-11-21', randomUUID);
    await decideAfterPaidTrial(db, disney, 'cancel', '2026-11-21', randomUUID);
    expect(await subscriptionsRepository(db).get(disney)).toMatchObject({ status: 'to_cancel', period_end_date: '2026-12-19' });
    expect(await chargeOf(disney, '2026-12-20')).toMatchObject({ status: 'unfunded' });
  });

  it('fin de période sans confirmation : question, puis résilié quand on confirme', async () => {
    await transitionSubscription(db, spotify, { type: 'stop', periodEndDate: '2026-12-20' }, created, randomUUID);
    const { questions } = await loadHome(db, '2026-12-21');
    expect(questions.map((q) => [q.kind, q.name])).toContainEqual(['cancel_confirmation', 'Spotify']);
    await confirmCancellation(db, spotify, '2026-12-21', randomUUID);
    expect(await subscriptionsRepository(db).get(spotify)).toMatchObject({ status: 'cancelled', cancel_done: 1 });
  });

  it('résiliation confirmée avant la fin : passage automatique le lendemain, rejouable', async () => {
    await transitionSubscription(db, spotify, { type: 'stop', periodEndDate: '2026-12-20' }, created, randomUUID);
    await confirmCancellation(db, spotify, created, randomUUID);
    expect(await subscriptionsRepository(db).get(spotify)).toMatchObject({ status: 'to_cancel' });
    await runDailyMaintenance(db, '2026-12-21', randomUUID);
    await runDailyMaintenance(db, '2026-12-21', randomUUID);
    expect(await subscriptionsRepository(db).get(spotify)).toMatchObject({ status: 'cancelled' });
    const changes = await db.selectFrom('event').select('payload').where('subscription_id', '=', spotify).where('type', '=', 'status_change').execute();
    expect(changes.filter((c) => JSON.parse(c.payload).to === 'cancelled')).toHaveLength(1);
  });

  it('avance le prochain prélèvement une fois le précédent rapproché', async () => {
    const charge = await chargeOf(icloud, '2026-11-19');
    await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 299, date: '2026-11-19' }, '2026-11-21', randomUUID);
    await runDailyMaintenance(db, '2026-11-21', randomUUID);
    expect(await subscriptionsRepository(db).get(icloud)).toMatchObject({ next_charge_date: '2026-12-19' });
    expect(await chargeOf(icloud, '2026-11-19')).toMatchObject({ status: 'paid' });
  });
});

describe('prélèvement inconnu et transfert correctif', () => {
  it('rattache un débit proche d’un prélèvement ouvert', async () => {
    expect(await classifyDebit(db, { name: 'spotify', amountCents: 1199, date: '2026-11-22' })).toMatchObject({ kind: 'matches_charge', name: 'Spotify', dueDate: '2026-11-21' });
  });

  it('enregistre un débit inconnu, compté dans le solde', async () => {
    const debit = { name: 'Canal+', amountCents: 2499, date: '2026-11-18' };
    const outcome = await classifyDebit(db, debit);
    expect(outcome).toEqual({ kind: 'event', type: 'unexpected_charge', subscriptionId: null, offerCreateSubscription: true });
    if (outcome.kind === 'event') {
      await recordUnknownDebit(db, debit, outcome, randomUUID);
    }
    const ledger = await loadLedger(db);
    expect(estimatedBalance(ledger, '2026-11-18')).toBe(-2499);
  });

  it('transfert correctif après une hausse de prix : différence transférée et prélèvement réajusté', async () => {
    const { next } = await loadHome(db, created);
    await markTransferDone(db, next!.id);
    const charge = await chargeOf(icloud, '2026-11-19');
    await reviewCharge(db, charge.id, { kind: 'failed', choice: 'merchant_will_retry' }, '2026-11-21', randomUUID);
    expect(await correctiveTransfer(db, charge.id, 349, '2026-11-21', randomUUID)).toBe(41);
    expect(await chargeOf(icloud, '2026-11-19')).toMatchObject({ status: 'funded', funded_amount_cents: 349, expected_amount_cents: 349 });
    const corrective = await db.selectFrom('transfer').selectAll().where('planned_date', '=', '2026-11-21').where('status', '=', 'done').executeTakeFirstOrThrow();
    expect(corrective.amount_cents).toBe(41);
  });
});
