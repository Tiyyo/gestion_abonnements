import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from '@/db/client';
import { createSubscription } from '@/db/commands/create-subscription';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import type { DB } from '@/db/types';
import { brandAliases, runBankSync } from './run-bank-sync';

let db: Kysely<DB>;
const config = { url: 'https://fn.example/transactions', secret: 's3cret' };
const today = '2026-11-22';

const reply = (transactions: unknown[], from: string) =>
  vi.fn(
    async (_url: string | URL | Request) =>
      new Response(JSON.stringify({ from, complete: true, transactions, fetchedAt: '2026-11-22T08:00:00Z' }), { status: 200 }),
  );

const netflixDebit = {
  id: 'rev-1',
  bookingDate: '2026-11-21',
  amountCents: 1349,
  currency: 'EUR',
  direction: 'debit',
  status: 'booked',
  label: 'NETFLIX.COM',
  remittance: null,
};

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  await createSubscription(
    db,
    {
      name: 'Séries du soir',
      iconKey: 'netflix',
      amountCents: 1349,
      periodUnit: 'month',
      periodCount: 1,
      status: 'active',
      firstChargeDate: '2026-11-21',
    },
    '2026-11-17',
    randomUUID,
  );
});

afterEach(async () => {
  await db.destroy();
});

describe('runBankSync', () => {
  it('relit 7 jours la première fois, puis repart 5 jours avant la dernière lecture', async () => {
    const first = reply([], '2026-11-15');
    await runBankSync(db, { config, today, newId: randomUUID, fetchImpl: first });
    expect(first.mock.calls[0]?.[0]).toBe('https://fn.example/transactions?from=2026-11-15');

    const second = reply([], '2026-11-20');
    await runBankSync(db, { config, today: '2026-11-25', newId: randomUUID, fetchImpl: second });
    expect(second.mock.calls[0]?.[0]).toBe('https://fn.example/transactions?from=2026-11-17');
    expect(await db.selectFrom('settings').select(['bank_sync_from', 'bank_sync_through']).executeTakeFirst()).toEqual({
      bank_sync_from: '2026-11-15',
      bank_sync_through: '2026-11-25',
    });
  });

  it('reconnaît le marchand par la marque du logo et marque passé le prélèvement financé', async () => {
    expect(brandAliases('netflix')).toEqual(['Netflix']);
    expect(brandAliases('tag')).toEqual([]);
    const transfer = await db.selectFrom('transfer').select('id').where('status', '=', 'planned').executeTakeFirstOrThrow();
    await markTransferDone(db, transfer.id);

    const result = await runBankSync(db, { config, today, newId: randomUUID, fetchImpl: reply([netflixDebit], '2026-11-15') });
    expect(result).toEqual({ applied: 1, suggested: 0, unmatched: 0 });
    expect(await db.selectFrom('charge').select('status').where('due_date', '=', '2026-11-21').executeTakeFirst()).toEqual({
      status: 'paid',
    });
  });

  it('n’appelle pas la banque quand le rapprochement automatique est coupé', async () => {
    await db.updateTable('settings').set({ auto_reconcile_enabled: 0 }).execute();
    const fetchImpl = reply([netflixDebit], '2026-11-15');
    expect(await runBankSync(db, { config, today, newId: randomUUID, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('n’enregistre rien si la réponse est hors contrat', async () => {
    const broken = reply([{ ...netflixDebit, amountCents: 13.49 }], '2026-11-15');
    await expect(runBankSync(db, { config, today, newId: randomUUID, fetchImpl: broken })).rejects.toThrow();
    expect(await db.selectFrom('bank_transaction').selectAll().execute()).toEqual([]);
    expect(await db.selectFrom('settings').select('bank_sync_through').executeTakeFirst()).toEqual({ bank_sync_through: null });
  });
});
