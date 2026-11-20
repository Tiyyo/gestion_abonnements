import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql.raw(`ALTER TABLE settings ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_done IN (0,1))`).execute(db);
  await sql.raw(`UPDATE settings SET onboarding_done = 1 WHERE EXISTS (SELECT 1 FROM subscription)`).execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql.raw(`ALTER TABLE settings DROP COLUMN onboarding_done`).execute(db);
}
