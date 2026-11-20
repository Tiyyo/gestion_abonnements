import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from './client';
import { createSubscription } from '@/db/commands/create-subscription';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { loadHome } from '@/db/repositories/home/load-home';
import { loadWidgetTransfers } from '@/db/repositories/widget-transfers';
import { buildWidgetSnapshot } from '@/features/widget/snapshot';
import type { DB } from './types';

let db: Kysely<DB>;
const today = '2026-11-18';

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  for (const [name, amountCents, firstChargeDate] of [
    ['iCloud+', 299, '2026-11-19'],
    ['Spotify', 1199, '2026-11-24'],
  ] as const) {
    await createSubscription(
      db,
      { name, amountCents, firstChargeDate, periodUnit: 'month', periodCount: 1, status: 'active' },
      '2026-11-17',
      randomUUID,
    );
  }
});

afterEach(async () => {
  await db.destroy();
});

describe('instantané du widget depuis la base', () => {
  it('affiche le même prochain transfert que l’Accueil', async () => {
    const home = await loadHome(db, today);
    const frame = buildWidgetSnapshot(await loadWidgetTransfers(db), today).frames[0];
    expect(home.next).not.toBeNull();
    expect(frame.state).toBe('next');
    expect(frame.caption).toBe('Aujourd’hui · 18 nov');
    expect(frame.detail).toBe('Pour iCloud+');
    expect(frame.headline.startsWith('3,0')).toBe(true);
  });

  it('un transfert marqué fait laisse la place au suivant', async () => {
    const home = await loadHome(db, today);
    await markTransferDone(db, home.next!.id);
    const frame = buildWidgetSnapshot(await loadWidgetTransfers(db), today).frames[0];
    expect(frame.state).toBe('next');
    expect(frame.detail).toBe('Pour Spotify');
  });

  it('signale le retard quand la date du transfert est passée', async () => {
    const frame = buildWidgetSnapshot(await loadWidgetTransfers(db), '2026-11-19').frames[0];
    expect(frame.state).toBe('overdue');
    expect(frame.caption).toBe('En retard · 18 nov');
  });
});
