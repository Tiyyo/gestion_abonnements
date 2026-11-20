import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql.raw(`ALTER TABLE transfer ADD COLUMN rescheduled_date TEXT`).execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql.raw(`ALTER TABLE transfer DROP COLUMN rescheduled_date`).execute(db);
}
