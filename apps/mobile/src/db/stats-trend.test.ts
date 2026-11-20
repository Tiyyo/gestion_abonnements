import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { archiveSubscription } from '@/db/commands/archive-subscription';
import { createSubscription } from '@/db/commands/create-subscription';
import { reviewCharge } from '@/db/reconcile/review-charge';
import { loadStats } from '@/db/repositories/stats';
import { loadMonthlyTrend, monthOf, shiftMonth } from '@/db/repositories/stats-trend';
import type { NewSubscriptionInput } from '@/db/repositories/subscriptions';
import type { ChargeStatus, DB } from './types';

const today = '2026-11-20';

async function setup() {
  const db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  const add = (input: Partial<NewSubscriptionInput> & Pick<NewSubscriptionInput, 'name' | 'amountCents' | 'firstChargeDate'>) =>
    createSubscription(db, { periodUnit: 'month', periodCount: 1, status: 'active', ...input }, '2026-11-17', randomUUID);
  /** Prélèvement d'historique, écrit tel que le rapprochement l'aurait laissé. */
  const past = (subscriptionId: string, date: string, cents: number, extra: { status?: ChargeStatus; provision?: boolean } = {}) => {
    const paid = (extra.status ?? 'paid') === 'paid';
    return db
      .insertInto('charge')
      .values({
        id: randomUUID(),
        subscription_id: subscriptionId,
        due_date: date,
        expected_amount_cents: cents,
        status: extra.status ?? 'paid',
        provision_only: extra.provision ? 1 : 0,
        actual_amount_cents: paid ? cents : null,
        actual_date: paid ? date : null,
      })
      .execute();
  };
  return { db, add, past };
}

describe('mois calendaires', () => {
  it('décale un mois en passant les années', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', -11)).toBe('2025-12');
    expect(monthOf('2026-03-01')).toBe('2026-03');
  });
});

describe('tendance mensuelle', () => {
  it('rend douze mois à zéro et un mois suivant vide sans données', async () => {
    const { db } = await setup();
    const trend = await loadMonthlyTrend(db, today);
    expect(trend.months.map((m) => m.month)).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(trend.months.every((m) => m.paidCents === 0 && m.plannedCents === 0)).toBe(true);
    expect(trend.nextMonth).toEqual({ month: '2026-12', paidCents: 0, plannedCents: 0 });
    await db.destroy();
  });

  it('range le payé par mois de paiement réel et le prévu par échéance', async () => {
    const { db, add, past } = await setup();
    const icloud = await add({ name: 'iCloud+', amountCents: 299, firstChargeDate: '2026-11-19' });
    const spotify = await add({ name: 'Spotify', amountCents: 1199, firstChargeDate: '2026-11-21' });
    await add({ name: 'Disney+', amountCents: 999, firstChargeDate: '2026-11-25', status: 'trial' });
    await past(spotify, '2026-10-21', 1199);
    await past(spotify, '2026-09-21', 1099);
    await past(icloud, '2026-09-19', 299);
    await past(spotify, '2025-12-01', 1099);
    await past(spotify, '2025-11-30', 1099);
    await past(spotify, '2026-08-21', 1099, { status: 'failed' });
    await past(spotify, '2026-07-21', 5000, { provision: true });

    const charge = await db
      .selectFrom('charge')
      .select('id')
      .where('subscription_id', '=', icloud)
      .where('due_date', '=', '2026-11-19')
      .executeTakeFirstOrThrow();
    await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 349, date: '2026-11-19' }, today, randomUUID);

    const trend = await loadMonthlyTrend(db, today);
    const byMonth = Object.fromEntries(trend.months.map((m) => [m.month, m]));
    expect(byMonth['2025-12']).toMatchObject({ paidCents: 1099, plannedCents: 0 });
    expect(byMonth['2026-07']).toMatchObject({ paidCents: 0 });
    expect(byMonth['2026-08']).toMatchObject({ paidCents: 0 });
    expect(byMonth['2026-09']).toMatchObject({ paidCents: 1398, plannedCents: 0 });
    expect(byMonth['2026-10']).toMatchObject({ paidCents: 1199, plannedCents: 0 });
    // Novembre : iCloud+ payé au montant réel (3,49 €), Spotify encore prévu ; l'essai Disney+ n'est pas financé, donc pas compté.
    expect(byMonth['2026-11']).toEqual({ month: '2026-11', paidCents: 349, plannedCents: 1199 });
    // Décembre : iCloud+ (nouveau montant ou non, c'est l'attendu de l'échéance) et Spotify.
    expect(trend.nextMonth.paidCents).toBe(0);
    expect(trend.nextMonth.plannedCents).toBeGreaterThanOrEqual(1199 + 299);

    // Mêmes prélèvements que « Dépensé sur 12 mois » ; seule la fenêtre diffère : 365 jours glissants d'un côté,
    // mois calendaires de l'autre. Le paiement du 30/11/2025 est donc dans le total glissant, pas dans les douze barres.
    const stats = await loadStats(db, today);
    const paidTotal = trend.months.reduce((t, m) => t + m.paidCents, 0);
    expect(paidTotal).toBe(4045);
    expect(stats.spentLast12MonthsCents).toBe(paidTotal + 1099);
    await db.destroy();
  });

  it('ignore le prévu d’un abonnement archivé mais garde ce qu’il a déjà coûté', async () => {
    const { db, add, past } = await setup();
    const vpn = await add({ name: 'Ancien VPN', amountCents: 499, firstChargeDate: '2026-11-28' });
    await past(vpn, '2026-10-28', 499);
    await archiveSubscription(db, vpn, today, randomUUID);
    const trend = await loadMonthlyTrend(db, today);
    expect(trend.months[10]).toMatchObject({ month: '2026-10', paidCents: 499 });
    expect(trend.months[11]).toMatchObject({ month: '2026-11', paidCents: 0, plannedCents: 0 });
    expect(trend.nextMonth.plannedCents).toBe(0);
    await db.destroy();
  });
});
