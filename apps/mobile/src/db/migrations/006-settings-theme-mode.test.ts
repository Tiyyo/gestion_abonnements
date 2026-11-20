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

describe('migration 006_settings_theme_mode', () => {
  it('suit le thème du système par défaut', async () => {
    const row = await db.selectFrom('settings').select('theme_mode').where('id', '=', 1).executeTakeFirstOrThrow();
    expect(row.theme_mode).toBe('system');
  });

  it('accepte clair et sombre, refuse toute autre valeur', async () => {
    for (const mode of ['light', 'dark'] as const) {
      await db.updateTable('settings').set({ theme_mode: mode }).where('id', '=', 1).execute();
      const row = await db.selectFrom('settings').select('theme_mode').where('id', '=', 1).executeTakeFirstOrThrow();
      expect(row.theme_mode).toBe(mode);
    }
    await expect(
      db
        .updateTable('settings')
        .set({ theme_mode: 'sepia' as never })
        .where('id', '=', 1)
        .execute(),
    ).rejects.toThrow();
  });

  it('supporte le retour arrière vers 005_bank_sync', async () => {
    const migrator = new Migrator({ db, provider: migrationProvider });
    const { error } = await migrator.migrateTo('005_bank_sync');
    expect(error).toBeUndefined();
    const columns = await db
      .selectFrom(sql<{ name: string }>`pragma_table_info('settings')`.as('c'))
      .select('name')
      .execute();
    expect(columns.map((c) => c.name)).not.toContain('theme_mode');
  });
});
