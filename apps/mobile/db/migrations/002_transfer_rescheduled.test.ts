import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import { initDb } from '../client';
import type { DB } from '../types';
import { migrationProvider } from './index';

let db: Kysely<DB>;

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
});

afterEach(async () => {
  await db.destroy();
});

describe('migration 002_transfer_rescheduled', () => {
  it('ajoute une date de report vide par défaut', async () => {
    await db
      .insertInto('transfer')
      .values({ id: 't-1', type: 'vault_to_main', planned_date: '2026-11-20', amount_cents: 1235 })
      .execute();
    const row = await db.selectFrom('transfer').select('rescheduled_date').executeTakeFirstOrThrow();
    expect(row.rescheduled_date).toBeNull();
  });

  it('conserve la date de report', async () => {
    await db
      .insertInto('transfer')
      .values({
        id: 't-1',
        type: 'vault_to_main',
        planned_date: '2026-11-20',
        rescheduled_date: '2026-11-21',
        amount_cents: 1235,
      })
      .execute();
    const row = await db.selectFrom('transfer').select('rescheduled_date').executeTakeFirstOrThrow();
    expect(row.rescheduled_date).toBe('2026-11-21');
  });

  it('supporte le retour arrière vers 001_init', async () => {
    const migrator = new Migrator({ db, provider: migrationProvider });
    const { error } = await migrator.migrateTo('001_init');
    expect(error).toBeUndefined();
    const columns = await db
      .selectFrom(sql<{ name: string }>`pragma_table_info('transfer')`.as('c'))
      .select('name')
      .execute();
    expect(columns.map((c) => c.name)).not.toContain('rescheduled_date');
  });
});
