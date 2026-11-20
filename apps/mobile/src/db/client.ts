import { type Dialect, Kysely, sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import type { DB } from './types';
import { migrationProvider } from '@/db/migrations';

export function createDb(dialect: Dialect): Kysely<DB> {
  return new Kysely<DB>({ dialect });
}

export async function initDb(db: Kysely<DB>) {
  await sql`PRAGMA foreign_keys = ON`.execute(db);
  await sql`PRAGMA busy_timeout = 5000`.execute(db);
  await sql`PRAGMA journal_mode = WAL`.execute(db);

  const migrator = new Migrator({ db, provider: migrationProvider });
  const { error, results } = await migrator.migrateToLatest();
  if (error) {
    throw error;
  }
  return results ?? [];
}
