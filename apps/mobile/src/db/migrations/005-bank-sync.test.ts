import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import { initDb } from '@/db/client';
import { migrationProvider } from '@/db/migrations';
import type { DB } from '@/db/types';

let db: Kysely<DB>;

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
});

afterEach(async () => {
  await db.destroy();
});

const row = { id: 'rev-001', booking_date: '2026-11-12', amount_cents: 1349, label: 'Netflix', outcome: 'unmatched' as const };

describe('migration 005_bank_sync', () => {
  it('active le rapprochement automatique par défaut, sans lecture connue', async () => {
    const settings = await db
      .selectFrom('settings')
      .select(['auto_reconcile_enabled', 'bank_sync_from', 'bank_sync_through', 'bank_sync_at'])
      .where('id', '=', 1)
      .executeTakeFirstOrThrow();
    expect(settings).toEqual({ auto_reconcile_enabled: 1, bank_sync_from: null, bank_sync_through: null, bank_sync_at: null });
  });

  it('n’enregistre un mouvement qu’une fois', async () => {
    await db.insertInto('bank_transaction').values(row).execute();
    await expect(db.insertInto('bank_transaction').values(row).execute()).rejects.toThrow();
  });

  it('refuse un sort inconnu, un montant nul et un interrupteur hors 0 ou 1', async () => {
    await expect(
      db
        .insertInto('bank_transaction')
        .values({ ...row, outcome: 'guessed' as never })
        .execute(),
    ).rejects.toThrow();
    await expect(
      db
        .insertInto('bank_transaction')
        .values({ ...row, amount_cents: 0 })
        .execute(),
    ).rejects.toThrow();
    await expect(
      db
        .updateTable('settings')
        .set({ auto_reconcile_enabled: 2 as never })
        .where('id', '=', 1)
        .execute(),
    ).rejects.toThrow();
  });

  it('supporte le retour arrière vers 004_settings_toggles', async () => {
    const migrator = new Migrator({ db, provider: migrationProvider });
    const { error } = await migrator.migrateTo('004_settings_toggles');
    expect(error).toBeUndefined();
    const columns = await db
      .selectFrom(sql<{ name: string }>`pragma_table_info('settings')`.as('c'))
      .select('name')
      .execute();
    expect(columns.map((c) => c.name)).not.toContain('auto_reconcile_enabled');
    expect(columns.map((c) => c.name)).not.toContain('bank_sync_at');
    const tables = await db
      .selectFrom(sql<{ name: string }>`sqlite_master`.as('m'))
      .select('name')
      .execute();
    expect(tables.map((t) => t.name)).not.toContain('bank_transaction');
  });
});
