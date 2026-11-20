import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import { initDb } from '@/db/client';
import type { DB } from '@/db/types';
import { migrationProvider } from '@/db/migrations';

let db: Kysely<DB>;

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
});

afterEach(async () => {
  await db.destroy();
});

describe('migration 004_settings_toggles', () => {
  it('active les rappels et la suggestion IA par défaut', async () => {
    const row = await db
      .selectFrom('settings')
      .select(['reminders_enabled', 'ai_suggestion_enabled'])
      .where('id', '=', 1)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ reminders_enabled: 1, ai_suggestion_enabled: 1 });
  });

  it('refuse une valeur autre que 0 ou 1', async () => {
    await expect(
      db
        .updateTable('settings')
        .set({ reminders_enabled: 2 as never })
        .where('id', '=', 1)
        .execute(),
    ).rejects.toThrow();
  });

  it('supporte le retour arrière vers 003_settings_onboarding', async () => {
    const migrator = new Migrator({ db, provider: migrationProvider });
    const { error } = await migrator.migrateTo('003_settings_onboarding');
    expect(error).toBeUndefined();
    const columns = await db
      .selectFrom(sql<{ name: string }>`pragma_table_info('settings')`.as('c'))
      .select('name')
      .execute();
    const names = columns.map((c) => c.name);
    expect(names).not.toContain('reminders_enabled');
    expect(names).not.toContain('ai_suggestion_enabled');
  });
});
