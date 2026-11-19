import { type Kysely, sql } from 'kysely';
import { Migrator, NO_MIGRATIONS } from 'kysely/migration';
import { z } from 'zod';
import { migrationProvider, migrations } from './migrations';
import type { DB } from './types';

export const EXPORT_FORMAT = 1;

export const EXPORTED_TABLES = [
  'settings',
  'category',
  'subscription',
  'charge',
  'transfer',
  'transfer_charge',
  'event',
  'ai_correction',
] as const;

type ExportedTable = (typeof EXPORTED_TABLES)[number];

const MIGRATION_NAMES = Object.keys(migrations).sort();
export const LATEST_MIGRATION = MIGRATION_NAMES[MIGRATION_NAMES.length - 1] ?? '';

const record = z.record(z.string().regex(/^[a-z_]+$/), z.union([z.string(), z.number(), z.null()]));

export const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  migration: z.string(),
  exportedAt: z.string(),
  tables: z.object(Object.fromEntries(EXPORTED_TABLES.map((t) => [t, z.array(record)])) as Record<ExportedTable, z.ZodArray<typeof record>>).strict(),
});

export type ExportFile = z.infer<typeof exportSchema>;

export class ImportError extends Error {}

export async function exportData(db: Kysely<DB>): Promise<ExportFile> {
  const tables = {} as ExportFile['tables'];
  for (const table of EXPORTED_TABLES) {
    tables[table] = (await sql<Record<string, string | number | null>>`SELECT * FROM ${sql.table(table)}`.execute(db)).rows;
  }
  return { format: EXPORT_FORMAT, migration: LATEST_MIGRATION, exportedAt: new Date().toISOString(), tables };
}

export function parseExport(text: string): ExportFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('Le fichier n’est pas un JSON valide.');
  }
  const parsed = exportSchema.safeParse(json);
  if (!parsed.success) {
    throw new ImportError('Le fichier ne correspond pas au format d’export de l’app.');
  }
  if (!MIGRATION_NAMES.includes(parsed.data.migration)) {
    throw new ImportError(
      parsed.data.migration > LATEST_MIGRATION ? 'Ce fichier vient d’une version plus récente : mets à jour l’app.' : 'Version de fichier inconnue.',
    );
  }
  if (parsed.data.tables.settings.length !== 1) {
    throw new ImportError('Le fichier doit contenir exactement une ligne de réglages.');
  }
  return parsed.data;
}

async function migrate(db: Kysely<DB>, target: string | typeof NO_MIGRATIONS): Promise<void> {
  const { error } = await new Migrator({ db, provider: migrationProvider }).migrateTo(target);
  if (error) {
    throw error;
  }
}

async function replaceWith(db: Kysely<DB>, file: ExportFile): Promise<void> {
  await migrate(db, NO_MIGRATIONS);
  await migrate(db, file.migration);
  await db.transaction().execute(async (trx) => {
    await sql`DELETE FROM category`.execute(trx);
    await sql`DELETE FROM settings`.execute(trx);
    for (const table of EXPORTED_TABLES) {
      for (const row of file.tables[table]) {
        const columns = Object.keys(row);
        if (columns.length === 0) {
          continue;
        }
        await sql`INSERT INTO ${sql.table(table)} (${sql.join(columns.map((c) => sql.ref(c)))}) VALUES (${sql.join(columns.map((c) => row[c] ?? null))})`.execute(trx);
      }
    }
  });
  const { error } = await new Migrator({ db, provider: migrationProvider }).migrateToLatest();
  if (error) {
    throw error;
  }
}

export async function importData(db: Kysely<DB>, file: ExportFile, safetyCopy: ExportFile): Promise<void> {
  try {
    await replaceWith(db, file);
  } catch (error) {
    await replaceWith(db, safetyCopy);
    throw new ImportError(`Import annulé, la base a été restaurée : ${(error as Error).message}`);
  }
}
