import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from '../client';
import type { DB } from '../types';

let db: Kysely<DB>;

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
});

afterEach(async () => {
  await db.destroy();
});

const baseSubscription = {
  id: 'sub-1',
  name: 'Spotify',
  amount_cents: 1199,
  period_unit: 'month' as const,
  anchor_day: 21,
  next_charge_date: '2026-11-21',
};

describe('migration 001_init', () => {
  it('crée les réglages par défaut et les 9 catégories', async () => {
    const settings = await db.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
    expect(settings.global_margin_bp).toBe(300);
    expect(settings.funding_lead_days).toBe(1);

    const categories = await db.selectFrom('category').select('id').execute();
    expect(categories).toHaveLength(9);
  });

  it('rejette une marge de surcharge supérieure à 5 %', async () => {
    await expect(
      db.insertInto('subscription').values({ ...baseSubscription, margin_override_bp: 501 }).execute(),
    ).rejects.toThrow();
  });

  it('rejette un essai sans date de fin ni montant après essai', async () => {
    await expect(
      db.insertInto('subscription').values({ ...baseSubscription, status: 'trial' }).execute(),
    ).rejects.toThrow();
  });

  it('rejette un abonnement à résilier sans fin de période', async () => {
    await expect(
      db.insertInto('subscription').values({ ...baseSubscription, status: 'to_cancel' }).execute(),
    ).rejects.toThrow();
  });

  it('rejette un prélèvement payé sans montant ni date constatés', async () => {
    await db.insertInto('subscription').values(baseSubscription).execute();
    await expect(
      db
        .insertInto('charge')
        .values({ id: 'c-1', subscription_id: 'sub-1', due_date: '2026-11-21', expected_amount_cents: 1199, status: 'paid' })
        .execute(),
    ).rejects.toThrow();
  });

  it('rejette un prélèvement non financé avec un montant financé', async () => {
    await db.insertInto('subscription').values(baseSubscription).execute();
    await expect(
      db
        .insertInto('charge')
        .values({
          id: 'c-1',
          subscription_id: 'sub-1',
          due_date: '2026-11-21',
          expected_amount_cents: 1199,
          funded_amount_cents: 1235,
          status: 'unfunded',
        })
        .execute(),
    ).rejects.toThrow();
  });

  it('interdit deux prélèvements identiques pour le même abonnement et la même date', async () => {
    await db.insertInto('subscription').values(baseSubscription).execute();
    const charge = { subscription_id: 'sub-1', due_date: '2026-11-21', expected_amount_cents: 1199 };
    await db.insertInto('charge').values({ id: 'c-1', ...charge }).execute();
    await expect(db.insertInto('charge').values({ id: 'c-2', ...charge }).execute()).rejects.toThrow();
  });

  it('supprime les prélèvements en cascade avec leur abonnement', async () => {
    await db.insertInto('subscription').values(baseSubscription).execute();
    await db
      .insertInto('charge')
      .values({ id: 'c-1', subscription_id: 'sub-1', due_date: '2026-11-21', expected_amount_cents: 1199 })
      .execute();
    await db.deleteFrom('subscription').where('id', '=', 'sub-1').execute();
    const remaining = await db.selectFrom('charge').select('id').execute();
    expect(remaining).toHaveLength(0);
  });

  it('met à jour updated_at via le trigger', async () => {
    await db
      .insertInto('subscription')
      .values({ ...baseSubscription, updated_at: '2020-01-01T00:00:00Z' })
      .execute();
    await db.updateTable('subscription').set({ name: 'Spotify Premium' }).where('id', '=', 'sub-1').execute();
    const row = await db.selectFrom('subscription').select('updated_at').where('id', '=', 'sub-1').executeTakeFirstOrThrow();
    expect(row.updated_at > '2020-01-01T00:00:00Z').toBe(true);
  });

  it('calcule le coût mensuel normalisé (annuel / 12)', async () => {
    await db.insertInto('subscription').values(baseSubscription).execute();
    await db
      .insertInto('subscription')
      .values({
        id: 'sub-2',
        name: 'Nom de domaine',
        amount_cents: 5000,
        period_unit: 'year',
        anchor_day: 3,
        next_charge_date: '2027-03-03',
      })
      .execute();
    const rows = await db.selectFrom('v_monthly_cost').select(['subscription_id', 'monthly_cents']).execute();
    const byId = Object.fromEntries(rows.map((r) => [r.subscription_id, r.monthly_cents]));
    expect(byId['sub-1']).toBe(1199);
    expect(byId['sub-2']).toBe(417);
  });

  it('supporte le retour arrière', async () => {
    const { migrationProvider } = await import('./index');
    const migrations = await migrationProvider.getMigrations();
    await migrations['001_init'].down!(db);
    const tables = await db
      .selectFrom('sqlite_master' as never)
      .select('name' as never)
      .where('type' as never, '=', 'table' as never)
      .execute();
    expect((tables as { name: string }[]).filter((t) => !t.name.startsWith('kysely_') && !t.name.startsWith('sqlite_'))).toHaveLength(0);
  });
});
