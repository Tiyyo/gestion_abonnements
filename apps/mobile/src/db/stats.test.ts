import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { createSubscription } from '@/db/commands/create-subscription';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { reviewCharge } from '@/db/reconcile/review-charge';
import { loadStats } from '@/db/repositories/stats';
import type { NewSubscriptionInput } from '@/db/repositories/subscriptions';
import type { DB } from './types';

const today = '2026-11-17';

it('reproduit les statistiques des maquettes', async () => {
  const db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  const add = (input: Partial<NewSubscriptionInput> & Pick<NewSubscriptionInput, 'name' | 'amountCents' | 'firstChargeDate'>) =>
    createSubscription(db, { periodUnit: 'month', periodCount: 1, status: 'active', ...input }, today, randomUUID);
  const icloud = await add({ name: 'iCloud+', amountCents: 299, firstChargeDate: '2026-11-19', categoryId: 'cat-cloud' });
  await add({ name: 'Spotify', amountCents: 1199, firstChargeDate: '2026-11-21', categoryId: 'cat-musique' });
  await add({ name: 'Netflix', amountCents: 1349, firstChargeDate: '2026-11-24', categoryId: 'cat-video' });
  await add({ name: 'Nom de domaine', amountCents: 5000, firstChargeDate: '2027-03-03', periodUnit: 'year' });
  await add({ name: 'Disney+', amountCents: 999, firstChargeDate: '2026-11-20', status: 'trial', categoryId: 'cat-video' });
  const vpn = await add({ name: 'Ancien VPN', amountCents: 499, firstChargeDate: '2026-12-01' });
  await transitionSubscription(db, vpn, { type: 'stop', periodEndDate: '2026-11-30' }, today, randomUUID);

  const charge = await db
    .selectFrom('charge')
    .select('id')
    .where('subscription_id', '=', icloud)
    .where('due_date', '=', '2026-11-19')
    .executeTakeFirstOrThrow();
  await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 299, date: '2026-11-19' }, '2026-11-20', randomUUID);

  const stats = await loadStats(db, '2026-11-20');
  expect(stats).toMatchObject({
    monthlyCents: 3264,
    annualCents: 39164,
    monthlySubscriptionsCents: 2847,
    longSubscriptionsPerMonthCents: 417,
    excludedCount: 2,
    spentLast12MonthsCents: 299,
    topSubscription: { name: 'Netflix', annualCents: 16188 },
  });
  expect(stats.monthlyByCategory).toEqual([
    { category: 'Vidéo', cents: 1349 },
    { category: 'Musique', cents: 1199 },
    { category: 'Autre', cents: 417 },
    { category: 'Stockage cloud', cents: 299 },
  ]);
  await db.destroy();
});
