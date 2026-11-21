import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { createSubscription } from '@/db/commands/create-subscription';
import { dismissPriceAlert } from '@/db/commands/dismiss-price-alert';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { updateSubscription } from '@/db/commands/update-subscription';
import { reviewCharge } from '@/db/reconcile/review-charge';
import { updateSubscriptionAmount } from '@/db/reconcile/update-subscription-amount';
import { loadHome } from '@/db/repositories/home/load-home';
import { loadPriceIncreases } from '@/db/repositories/stats';
import type { NewSubscriptionInput } from '@/db/repositories/subscriptions';
import type { DB } from './types';

let db: Kysely<DB>;
let spotify: string;
const created = '2026-11-17';

const add = (input: Partial<NewSubscriptionInput> & Pick<NewSubscriptionInput, 'name' | 'amountCents' | 'firstChargeDate'>) =>
  createSubscription(db, { periodUnit: 'month', periodCount: 1, status: 'active', ...input }, created, randomUUID);

const edit = (id: string, name: string, amountCents: number, date: string, today: string, periodUnit: 'month' | 'year' = 'month') =>
  updateSubscription(db, id, { name, amountCents, periodUnit, periodCount: 1, date }, today, randomUUID);

const priceEvents = async (subscriptionId: string) => {
  const rows = await db
    .selectFrom('event')
    .select(['id', 'occurred_on', 'payload'])
    .where('subscription_id', '=', subscriptionId)
    .where('type', '=', 'price_change')
    .execute();
  return rows.map((r) => ({ id: r.id, occurredOn: r.occurred_on, payload: JSON.parse(r.payload) as Record<string, unknown> }));
};

const reviewPaid = async (subscriptionId: string, dueDate: string, amountCents: number, today: string) => {
  const charge = await db
    .selectFrom('charge')
    .select('id')
    .where('subscription_id', '=', subscriptionId)
    .where('due_date', '=', dueDate)
    .executeTakeFirstOrThrow();
  await reviewCharge(db, charge.id, { kind: 'paid', amountCents, date: dueDate }, today, randomUUID);
  return charge.id;
};

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  spotify = await add({ name: 'Spotify', amountCents: 1199, firstChargeDate: '2026-11-21' });
});

afterEach(async () => {
  await db.destroy();
});

describe('enregistrement des changements de prix', () => {
  it('modification à la main : événement appliqué avec ancien et nouveau montant', async () => {
    await edit(spotify, 'Spotify', 1299, '2026-11-21', '2026-11-18');
    expect(await priceEvents(spotify)).toEqual([
      expect.objectContaining({ occurredOn: '2026-11-18', payload: { from: 1199, to: 1299, source: 'manual', applied: true } }),
    ]);
  });

  it('modification sans changement de montant, ou pendant un essai : aucun événement', async () => {
    await edit(spotify, 'Spotify Premium', 1199, '2026-11-21', '2026-11-18');
    const trial = await add({ name: 'Disney+', amountCents: 999, firstChargeDate: '2026-11-25', status: 'trial' });
    await edit(trial, 'Disney+', 1099, '2026-11-25', '2026-11-18');
    expect(await priceEvents(spotify)).toEqual([]);
    expect(await priceEvents(trial)).toEqual([]);
  });

  it('rapprochement : écart en attente, puis appliqué quand le montant est reporté (un seul événement)', async () => {
    const chargeId = await reviewPaid(spotify, '2026-11-21', 1299, '2026-11-22');
    expect((await priceEvents(spotify)).map((e) => e.payload)).toEqual([
      { chargeId, from: 1199, to: 1299, source: 'reconciliation', applied: false },
    ]);
    expect((await loadHome(db, '2026-11-22')).priceAlerts).toEqual([]);

    await updateSubscriptionAmount(db, spotify, 1299, '2026-11-22', randomUUID);
    expect(await priceEvents(spotify)).toEqual([
      expect.objectContaining({
        occurredOn: '2026-11-21',
        payload: { chargeId, from: 1199, to: 1299, source: 'reconciliation', applied: true },
      }),
    ]);
  });

  it('montant reporté sans écart en attente : un événement appliqué est créé', async () => {
    await updateSubscriptionAmount(db, spotify, 1399, '2026-11-22', randomUUID);
    await updateSubscriptionAmount(db, spotify, 1399, '2026-11-23', randomUUID);
    expect(await priceEvents(spotify)).toEqual([
      expect.objectContaining({ occurredOn: '2026-11-22', payload: { from: 1199, to: 1399, source: 'reconciliation', applied: true } }),
    ]);
  });
});

describe('alerte « Hausse de prix » de l’Accueil', () => {
  it('apparaît après une hausse, avec son surcoût annuel, pendant 30 jours', async () => {
    await edit(spotify, 'Spotify', 1299, '2026-11-21', '2026-11-18');
    const [event] = await priceEvents(spotify);
    expect((await loadHome(db, '2026-11-18')).priceAlerts).toEqual([
      {
        eventId: event!.id,
        subscriptionId: spotify,
        name: 'Spotify',
        fromCents: 1199,
        toCents: 1299,
        occurredOn: '2026-11-18',
        annualImpactCents: 1200,
        nextChargeDate: '2026-11-21',
      },
    ]);
    expect((await loadHome(db, '2026-12-17')).priceAlerts).toHaveLength(1);
    expect((await loadHome(db, '2026-12-18')).priceAlerts).toEqual([]);
  });

  it('disparaît une fois masquée, sans toucher au reste de la charge utile', async () => {
    await edit(spotify, 'Spotify', 1299, '2026-11-21', '2026-11-18');
    const [event] = await priceEvents(spotify);
    await dismissPriceAlert(db, event!.id, '2026-11-19T08:00:00Z');
    expect((await loadHome(db, '2026-11-19')).priceAlerts).toEqual([]);
    expect((await priceEvents(spotify))[0]!.payload).toEqual({
      from: 1199,
      to: 1299,
      source: 'manual',
      applied: true,
      dismissedAt: '2026-11-19T08:00:00Z',
    });
  });

  it('ne concerne ni une baisse, ni une hausse suivie d’une baisse, ni un abonnement à résilier', async () => {
    const netflix = await add({ name: 'Netflix', amountCents: 1349, firstChargeDate: '2026-11-24' });
    await edit(netflix, 'Netflix', 1099, '2026-11-24', '2026-11-18');
    await edit(spotify, 'Spotify', 1299, '2026-11-21', '2026-11-18');
    await edit(spotify, 'Spotify', 1249, '2026-11-21', '2026-11-19');
    expect((await loadHome(db, '2026-11-19')).priceAlerts).toEqual([]);

    await edit(spotify, 'Spotify', 1399, '2026-11-21', '2026-11-19');
    expect((await loadHome(db, '2026-11-19')).priceAlerts.map((a) => [a.fromCents, a.toCents])).toEqual([[1249, 1399]]);
    await transitionSubscription(db, spotify, { type: 'stop', periodEndDate: '2026-11-30' }, '2026-11-19', randomUUID);
    expect((await loadHome(db, '2026-11-19')).priceAlerts).toEqual([]);
  });

  it('accepte un ancien événement sans source ni indicateur', async () => {
    await db
      .insertInto('event')
      .values({
        id: 'ancien',
        subscription_id: spotify,
        type: 'price_change',
        occurred_on: '2026-11-18',
        payload: '{"from":1199,"to":1299}',
      })
      .execute();
    expect((await loadHome(db, '2026-11-19')).priceAlerts.map((a) => a.eventId)).toEqual(['ancien']);
  });
});

describe('loadPriceIncreases', () => {
  it('compte les hausses appliquées des 12 derniers mois sur les abonnements actifs', async () => {
    const domaine = await add({ name: 'Nom de domaine', amountCents: 5000, firstChargeDate: '2027-03-03', periodUnit: 'year' });
    const vpn = await add({ name: 'VPN', amountCents: 499, firstChargeDate: '2026-12-01' });
    await edit(spotify, 'Spotify', 1299, '2026-11-21', '2026-11-18');
    await edit(spotify, 'Spotify', 1249, '2026-11-21', '2026-11-19');
    await edit(domaine, 'Nom de domaine', 5500, '2027-03-03', '2026-11-19', 'year');
    await edit(vpn, 'VPN', 599, '2026-12-01', '2026-11-19');
    await transitionSubscription(db, vpn, { type: 'stop', periodEndDate: '2026-11-30' }, '2026-11-19', randomUUID);
    await reviewPaid(spotify, '2026-11-21', 1499, '2026-11-22');

    expect(await loadPriceIncreases(db, '2026-11-22')).toEqual({ count: 2, annualImpactCents: 1700 });
    expect(await loadPriceIncreases(db, '2027-11-19')).toEqual({ count: 0, annualImpactCents: 0 });
    expect(await loadPriceIncreases(db, '2026-11-18')).toEqual({ count: 1, annualImpactCents: 1200 });
  });
});
