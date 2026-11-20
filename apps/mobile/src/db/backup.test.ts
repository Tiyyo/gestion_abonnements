import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { exportData, ImportError, importData, LATEST_MIGRATION, parseExport } from './backup';
import { initDb } from './client';
import { createSubscription } from '@/db/commands/create-subscription';
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
    const { bank_transaction: _bank, ...tables } = file.tables;
    const old = {
      ...file,
      migration: '001_init',
      tables: {
        ...tables,
        settings: file.tables.settings.map(
          ({
            onboarding_done: _o,
            reminders_enabled: _r,
            ai_suggestion_enabled: _a,
            auto_reconcile_enabled: _b,
            bank_sync_from: _f,
            bank_sync_through: _t,
            bank_sync_at: _s,
            theme_mode: _m,
            ...rest
          }) => rest,
        ),
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
    expect(await target.selectFrom('settings').select(['auto_reconcile_enabled', 'bank_sync_through']).executeTakeFirst()).toEqual({
      auto_reconcile_enabled: 1,
      bank_sync_through: null,
    });
  });

  it('conserve les mouvements bancaires déjà traités, pour ne pas les appliquer deux fois après un import', async () => {
    const source = await seeded();
    await source
      .insertInto('bank_transaction')
      .values({ id: 'rev-001', booking_date: '2026-11-12', amount_cents: 1349, label: 'Netflix', outcome: 'dismissed' })
      .execute();
    await source.updateTable('settings').set({ bank_sync_from: '2026-11-10', bank_sync_through: '2026-11-17' }).execute();

    const target = await freshDb();
    await importData(target, parseExport(JSON.stringify(await exportData(source))), await exportData(target));
    expect(await target.selectFrom('bank_transaction').select(['id', 'outcome']).execute()).toEqual([
      { id: 'rev-001', outcome: 'dismissed' },
    ]);
    expect(await target.selectFrom('settings').select('bank_sync_through').executeTakeFirst()).toEqual({ bank_sync_through: '2026-11-17' });
  });

  it('conserve le réglage « Apparence », et le remet sur « système » pour un export antérieur à la migration 006', async () => {
    const source = await seeded();
    await source.updateTable('settings').set({ theme_mode: 'dark' }).execute();
    const file = await exportData(source);

    const restored = await freshDb();
    await importData(restored, parseExport(JSON.stringify(file)), await exportData(restored));
    expect(await restored.selectFrom('settings').select('theme_mode').executeTakeFirst()).toEqual({ theme_mode: 'dark' });

    const before006 = {
      ...file,
      migration: '005_bank_sync',
      tables: { ...file.tables, settings: file.tables.settings.map(({ theme_mode: _t, ...rest }) => rest) },
    };
    const target = await freshDb();
    await target.updateTable('settings').set({ theme_mode: 'light' }).execute();
    await importData(target, parseExport(JSON.stringify(before006)), await exportData(target));
    expect(await counts(target)).toEqual(await counts(source));
    expect(await target.selectFrom('settings').select('theme_mode').executeTakeFirst()).toEqual({ theme_mode: 'system' });
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
