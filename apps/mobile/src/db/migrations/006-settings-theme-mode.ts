import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(`ALTER TABLE settings ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('system','light','dark'))`)
    .execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql.raw(`ALTER TABLE settings DROP COLUMN theme_mode`).execute(db);
}
