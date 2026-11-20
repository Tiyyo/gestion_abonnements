import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { initDb } from '@/db/client';
import { createSubscription } from '@/db/commands/create-subscription';
import { markTransferDoneFromNotification } from '@/db/commands/mark-transfer-done-from-notification';
import { undoTransferDone } from '@/db/commands/undo-transfer-done';
import { loadMonthPlan } from '@/db/repositories/plan/month-plan';
import { scheduledNotificationsRepository } from '@/db/repositories/scheduled-notifications';
import type { DB } from '@/db/types';

let db: Kysely<DB>;
const today = '2026-11-17';
const at = '2026-11-20T09:05';

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  await createSubscription(
    db,
    { name: 'Spotify', amountCents: 1199, periodUnit: 'month', periodCount: 1, status: 'active', firstChargeDate: '2026-11-21' },
    today,
    randomUUID,
  );
});

afterEach(async () => {
  await db.destroy();
});

const firstTransfer = async () => (await loadMonthPlan(db, 2026, 11, today)).transfers[0]!;
const press = (transferId: string, responseKey = 'n1|mark-done') =>
  markTransferDoneFromNotification(db, { transferId, responseKey, at }, randomUUID);

describe('markTransferDoneFromNotification', () => {
  it('marque le transfert fait et finance ses prélèvements', async () => {
    const transfer = await firstTransfer();
    const outcome = await press(transfer.id);
    expect(outcome).toMatchObject({ status: 'done', transfer: { id: transfer.id, amountCents: 1235 } });
    expect((await firstTransfer()).done).toBe(true);
    const charges = await db.selectFrom('charge').select('status').where('id', 'in', transfer.chargeIds).execute();
    expect(charges.map((c) => c.status)).toEqual(['funded']);
  });

  it('n’applique pas deux fois la même réponse, même si le transfert a été remis à faire', async () => {
    const transfer = await firstTransfer();
    await press(transfer.id);
    await undoTransferDone(db, transfer.id, randomUUID);
    expect(await press(transfer.id)).toEqual({ status: 'duplicate' });
    expect((await firstTransfer()).done).toBe(false);
  });

  it('signale un transfert déjà fait ou disparu, puis se tait', async () => {
    const transfer = await firstTransfer();
    await press(transfer.id, 'n1|mark-done');
    expect(await press(transfer.id, 'n2|mark-done')).toEqual({ status: 'unavailable' });
    expect(await press(transfer.id, 'n2|mark-done')).toEqual({ status: 'duplicate' });
    expect(await press('inconnu', 'n3|mark-done')).toEqual({ status: 'unavailable' });
  });

  it('garde la trace de la réponse quand les notifications sont replanifiées', async () => {
    const transfer = await firstTransfer();
    await press(transfer.id);
    await scheduledNotificationsRepository(db, randomUUID).purge('2026-11-20T09:06', '2026-11-20');
    expect(await press(transfer.id)).toEqual({ status: 'duplicate' });
  });
});
