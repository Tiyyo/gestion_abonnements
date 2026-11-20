import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { exportData, ImportError, importData, LATEST_MIGRATION, parseExport } from './backup';
import { initDb } from './client';
import { createSubscription } from './commands';
import type { DB } from './types';

const today = '2026-11-17';

async function freshDb(): Promise<Kysely<DB>> {
  const db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  return db;
}

async function seeded(): Promise<Kysely<DB>> {
  const db = await freshDb();
  await db.updateTable('settings').set({ global_margin_bp: 250, payday_day: 28 }).execute();
  await createSubscription(
    db,
    {
      name: 'Spotify',
      amountCents: 1199,
      periodUnit: 'month',
      periodCount: 1,
      status: 'active',
      firstChargeDate: '2026-11-21',
      categoryId: 'cat-musique',
      iconKey: 'spotify',
    },
    today,
    randomUUID,
  );
  return db;
}

const counts = async (db: Kysely<DB>) =>
  Object.fromEntries(
    await Promise.all(
      (['subscription', 'charge', 'transfer', 'transfer_charge', 'event', 'category'] as const).map(async (t) => [
        t,
        Number((await db.selectFrom(t).select(db.fn.countAll().as('n')).executeTakeFirstOrThrow()).n),
      ]),
    ),
  );

describe('export / import', () => {
  it('fait un aller-retour complet dans une autre base', async () => {
    const source = await seeded();
    const file = parseExport(JSON.stringify(await exportData(source)));
    expect(file.migration).toBe(LATEST_MIGRATION);

    const target = await freshDb();
    await createSubscription(
      target,
      { name: 'Ancien', amountCents: 100, periodUnit: 'month', periodCount: 1, status: 'active', firstChargeDate: '2026-11-30' },
      today,
      randomUUID,
    );
    await importData(target, file, await exportData(target));

    expect(await counts(target)).toEqual(await counts(source));
    expect(await target.selectFrom('subscription').select('name').execute()).toEqual([{ name: 'Spotify' }]);
    expect(await target.selectFrom('settings').select(['global_margin_bp', 'payday_day']).executeTakeFirst()).toEqual({
      global_margin_bp: 250,
      payday_day: 28,
    });
  });

  it('importe un fichier d’une migration plus ancienne puis remonte à la dernière', async () => {
    const source = await seeded();
    const file = await exportData(source);
    const old = {
      ...file,
      migration: '001_init',
      tables: {
        ...file.tables,
        settings: file.tables.settings.map(({ onboarding_done: _o, reminders_enabled: _r, ai_suggestion_enabled: _a, ...rest }) => rest),
        transfer: file.tables.transfer.map(({ rescheduled_date: _r, ...rest }) => rest),
      },
    };
    const target = await freshDb();
    await importData(target, parseExport(JSON.stringify(old)), await exportData(target));
    expect(await counts(target)).toEqual(await counts(source));
    expect(await target.selectFrom('transfer').select('rescheduled_date').executeTakeFirst()).toEqual({ rescheduled_date: null });
    expect(await target.selectFrom('settings').select(['reminders_enabled', 'ai_suggestion_enabled']).executeTakeFirst()).toEqual({
      reminders_enabled: 1,
      ai_suggestion_enabled: 1,
    });
  });

  it('refuse un fichier invalide ou plus récent que l’app, sans toucher à la base', () => {
    expect(() => parseExport('pas du json')).toThrow(ImportError);
    expect(() => parseExport(JSON.stringify({ format: 1 }))).toThrow(/format d’export/);
    expect(() =>
      parseExport(
        JSON.stringify({
          format: 1,
          migration: '999_futur',
          exportedAt: 'x',
          tables: {
            settings: [{ id: 1 }],
            category: [],
            subscription: [],
            charge: [],
            transfer: [],
            transfer_charge: [],
            event: [],
            ai_correction: [],
          },
        }),
      ),
    ).toThrow(/mets à jour l’app/);
  });

  it('restaure la base si l’insertion échoue', async () => {
    const target = await seeded();
    const safety = await exportData(target);
    const broken = { ...safety, tables: { ...safety.tables, charge: [{ ...safety.tables.charge[0]!, subscription_id: 'inexistant' }] } };
    await expect(importData(target, broken, safety)).rejects.toThrow(/restaurée/);
    expect(await counts(target)).toEqual(await counts(await seeded()));
  });
});
