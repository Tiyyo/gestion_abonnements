import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(`ALTER TABLE settings ADD COLUMN reminders_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reminders_enabled IN (0,1))`)
    .execute(db);
  await sql
    .raw(`ALTER TABLE settings ADD COLUMN ai_suggestion_enabled INTEGER NOT NULL DEFAULT 1 CHECK (ai_suggestion_enabled IN (0,1))`)
    .execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql.raw(`ALTER TABLE settings DROP COLUMN ai_suggestion_enabled`).execute(db);
  await sql.raw(`ALTER TABLE settings DROP COLUMN reminders_enabled`).execute(db);
}
