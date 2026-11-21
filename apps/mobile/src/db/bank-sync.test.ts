import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { createSubscription } from '@/db/commands/create-subscription';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { applyBankTransactions, type BankBatch } from '@/db/reconcile/bank/apply-bank-transactions';
import { dismissBankTransaction } from '@/db/reconcile/bank/dismiss-bank-transaction';
import { classifyDebit } from '@/db/reconcile/classify-debit';
import { recordUnknownDebit } from '@/db/reconcile/record-unknown-debit';
import { reviewCharge } from '@/db/reconcile/review-charge';
import { chargeToReview } from '@/db/repositories/charges';
import { loadHome } from '@/db/repositories/home/load-home';
import type { NewSubscriptionInput } from '@/db/repositories/subscriptions';
import { initDb } from './client';
import type { DB } from './types';

let db: Kysely<DB>;
let icloud: string;
let spotify: string;
let disney: string;
const created = '2026-11-17';
const today = '2026-11-22';

const add = (input: Partial<NewSubscriptionInput> & Pick<NewSubscriptionInput, 'name' | 'amountCents' | 'firstChargeDate'>) =>
  createSubscription(db, { periodUnit: 'month', periodCount: 1, status: 'active', ...input }, created, randomUUID);

const chargeOf = (subscriptionId: string, dueDate: string) =>
  db
    .selectFrom('charge')
    .selectAll()
    .where('subscription_id', '=', subscriptionId)
    .where('due_date', '=', dueDate)
    .executeTakeFirstOrThrow();

type Tx = BankBatch['transactions'][number];
const tx = (id: string, label: string, bookingDate: string, amountCents: number, patch: Partial<Tx> = {}): Tx => ({
  id,
  label,
  bookingDate,
  amountCents,
  currency: 'EUR',
  direction: 'debit',
  status: 'booked',
  remittance: null,
  ...patch,
});
const batch = (transactions: Tx[], from = '2026-11-15'): BankBatch => ({ from, complete: true, transactions });
const sync = (transactions: Tx[], on = today, from?: string) => applyBankTransactions(db, batch(transactions, from), on, randomUUID);
const stored = () => db.selectFrom('bank_transaction').select(['id', 'outcome', 'charge_id']).orderBy('id').execute();

/** Marque faits tous les transferts prévus : les prélèvements voulus deviennent financés. */
async function fundAll() {
  const transfers = await db.selectFrom('transfer').select('id').where('status', '=', 'planned').execute();
  for (const { id } of transfers) {
    await markTransferDone(db, id);
  }
}

beforeEach(async () => {
  db = new Kysely<DB>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) });
  await initDb(db);
  icloud = await add({ name: 'iCloud+', amountCents: 299, firstChargeDate: '2026-11-19' });
  spotify = await add({ name: 'Spotify', amountCents: 1199, firstChargeDate: '2026-11-21' });
  disney = await add({ name: 'Disney+', amountCents: 999, firstChargeDate: '2026-11-20', status: 'trial' });
});

afterEach(async () => {
  await db.destroy();
});

describe('rapprochement automatique', () => {
  it('marque passé un prélèvement financé, au montant exact, et ne l’applique qu’une fois', async () => {
    await fundAll();
    const debit = tx('rev-1', 'Spotify AB', '2026-11-21', 1199);
    expect(await sync([debit])).toEqual({ applied: 1, suggested: 0, unmatched: 0 });
    expect(await chargeOf(spotify, '2026-11-21')).toMatchObject({ status: 'paid', actual_amount_cents: 1199, actual_date: '2026-11-21' });
    const charge = await chargeOf(spotify, '2026-11-21');
    expect(await stored()).toEqual([{ id: 'rev-1', outcome: 'applied', charge_id: charge.id }]);

    expect(await sync([debit, debit])).toEqual({ applied: 0, suggested: 0, unmatched: 0 });
    expect(await stored()).toHaveLength(1);
    expect(await db.selectFrom('event').select('type').where('type', '!=', 'status_change').execute()).toEqual([]);
    const home = await loadHome(db, today);
    expect(home.toReview.map((r) => r.name)).toEqual(['iCloud+']);
    expect(home.unexpectedDebits).toEqual([]);
  });

  it('retient la période relue, sauf lecture incomplète', async () => {
    await sync([]);
    const read = () => db.selectFrom('settings').select(['bank_sync_from', 'bank_sync_through']).executeTakeFirstOrThrow();
    expect(await read()).toEqual({ bank_sync_from: '2026-11-15', bank_sync_through: today });
    await applyBankTransactions(db, { from: '2026-11-18', complete: false, transactions: [] }, '2026-11-25', randomUUID);
    expect(await read()).toEqual({ bank_sync_from: '2026-11-15', bank_sync_through: today });
  });

  it('ignore les crédits, les débits en attente et les autres devises, sans les retenir', async () => {
    await fundAll();
    const result = await sync([
      tx('rev-1', 'Spotify', '2026-11-21', 1199, { status: 'pending' }),
      tx('rev-2', 'Spotify', '2026-11-21', 1199, { direction: 'credit' }),
      tx('rev-3', 'Spotify', '2026-11-21', 1199, { currency: 'USD' }),
    ]);
    expect(result).toEqual({ applied: 0, suggested: 0, unmatched: 0 });
    expect(await stored()).toEqual([]);
    expect(await chargeOf(spotify, '2026-11-21')).toMatchObject({ status: 'funded' });
  });

  it.each([
    ['le transfert n’est pas marqué fait', false, 1199],
    ['le montant diffère', true, 1299],
  ])('propose sans rien changer quand %s', async (_label, funded, amountCents) => {
    if (funded) {
      await fundAll();
    }
    const before = await chargeOf(spotify, '2026-11-21');
    expect(await sync([tx('rev-1', 'Spotify', '2026-11-22', amountCents)])).toEqual({ applied: 0, suggested: 1, unmatched: 0 });
    expect(await chargeOf(spotify, '2026-11-21')).toEqual(before);

    const hint = { kind: 'debit', transactionId: 'rev-1', amountCents, date: '2026-11-22', label: 'Spotify' };
    const review = (await loadHome(db, today)).toReview.find((r) => r.name === 'Spotify');
    expect(review?.bank).toEqual(hint);
    expect((await chargeToReview(db, before.id))?.bankHint).toEqual(hint);

    await reviewCharge(db, before.id, { kind: 'paid', amountCents, date: '2026-11-22' }, today, randomUUID);
    const home = await loadHome(db, today);
    expect(home.toReview.map((r) => r.name)).not.toContain('Spotify');
    expect(home.unexpectedDebits).toEqual([]);
  });

  it('ne décide jamais d’un essai : le débit est proposé, l’abonnement reste en essai', async () => {
    expect(await sync([tx('rev-1', 'DisneyPlus', '2026-11-20', 999)])).toEqual({ applied: 0, suggested: 1, unmatched: 0 });
    expect(await chargeOf(disney, '2026-11-20')).toMatchObject({ status: 'unfunded' });
    expect(await db.selectFrom('subscription').select('status').where('id', '=', disney).executeTakeFirst()).toEqual({ status: 'trial' });
    const charge = await chargeOf(disney, '2026-11-20');
    expect((await chargeToReview(db, charge.id))?.bankHint).toMatchObject({ kind: 'debit', amountCents: 999 });
  });

  it('reconnaît un prélèvement déjà marqué passé à la main', async () => {
    const charge = await chargeOf(icloud, '2026-11-19');
    await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 299, date: '2026-11-19' }, today, randomUUID);
    expect(await sync([tx('rev-1', 'iCloud', '2026-11-20', 299)])).toEqual({ applied: 0, suggested: 0, unmatched: 0 });
    expect(await stored()).toEqual([{ id: 'rev-1', outcome: 'applied', charge_id: charge.id }]);
    expect(await sync([tx('rev-2', 'iCloud', '2026-11-20', 299)])).toEqual({ applied: 0, suggested: 0, unmatched: 1 });
  });

  it('signale un débit non prévu, classé comme une saisie manuelle, puis le solde une fois enregistré', async () => {
    expect(await sync([tx('rev-1', 'Canal Plus', '2026-11-18', 2499)])).toEqual({ applied: 0, suggested: 0, unmatched: 1 });
    const [card] = (await loadHome(db, today)).unexpectedDebits;
    expect(card).toMatchObject({
      transactionId: 'rev-1',
      name: 'Canal Plus',
      amountCents: 2499,
      date: '2026-11-18',
      kind: 'unexpected_charge',
    });

    const debit = { name: 'Canal Plus', amountCents: 2499, date: '2026-11-18' };
    const outcome = await classifyDebit(db, debit);
    if (outcome.kind !== 'event') {
      throw new Error('classement inattendu');
    }
    await recordUnknownDebit(db, debit, outcome, randomUUID, 'rev-1');
    expect((await stored())[0]).toMatchObject({ outcome: 'recorded' });
    expect((await loadHome(db, today)).unexpectedDebits).toEqual([]);
    expect(await sync([tx('rev-1', 'Canal Plus', '2026-11-18', 2499)])).toEqual({ applied: 0, suggested: 0, unmatched: 0 });
    expect(await db.selectFrom('event').select('type').where('type', '!=', 'status_change').execute()).toEqual([
      { type: 'unexpected_charge' },
    ]);
  });

  it('ne signale pas un débit inconnu déjà saisi à la main, une seule fois', async () => {
    const debit = { name: 'Canal+', amountCents: 2499, date: '2026-11-18' };
    const outcome = await classifyDebit(db, debit);
    if (outcome.kind === 'event') {
      await recordUnknownDebit(db, debit, outcome, randomUUID);
    }
    expect(await sync([tx('rev-1', 'Canal Plus', '2026-11-19', 2499)])).toEqual({ applied: 0, suggested: 0, unmatched: 0 });
    expect(await sync([tx('rev-2', 'Canal Plus', '2026-11-19', 2499)])).toEqual({ applied: 0, suggested: 0, unmatched: 1 });
  });

  it('rattache un débit signalé quand l’utilisateur le reconnaît, ou l’oublie s’il l’ignore', async () => {
    await sync([tx('rev-1', 'APPLE.COM/BILL', '2026-11-19', 299), tx('rev-2', 'Boulangerie', '2026-11-19', 450)]);
    const charge = await chargeOf(icloud, '2026-11-19');
    await reviewCharge(db, charge.id, { kind: 'paid', amountCents: 299, date: '2026-11-19' }, today, randomUUID, 'rev-1');
    await dismissBankTransaction(db, 'rev-2');
    expect(await stored()).toEqual([
      { id: 'rev-1', outcome: 'applied', charge_id: charge.id },
      { id: 'rev-2', outcome: 'dismissed', charge_id: null },
    ]);
    expect((await loadHome(db, today)).unexpectedDebits).toEqual([]);
  });

  it('remet en avant le débit proposé si le prélèvement est finalement abandonné', async () => {
    await sync([tx('rev-1', 'Spotify', '2026-11-22', 1299)]);
    const charge = await chargeOf(spotify, '2026-11-21');
    await reviewCharge(db, charge.id, { kind: 'failed', choice: 'give_up' }, today, randomUUID);
    const home = await loadHome(db, today);
    expect(home.unexpectedDebits).toEqual([expect.objectContaining({ transactionId: 'rev-1', name: 'Spotify', subscriptionId: spotify })]);
  });

  it('suggère l’échec, sans changer l’état, quand la fenêtre a été relue sans débit', async () => {
    await fundAll();
    await sync([], '2026-11-25', '2026-11-15');
    const home = await loadHome(db, '2026-11-25');
    expect(home.toReview.map((r) => [r.name, r.bank?.kind])).toEqual([
      ['iCloud+', 'no_debit'],
      ['Spotify', 'no_debit'],
    ]);
    expect(await chargeOf(icloud, '2026-11-19')).toMatchObject({ status: 'funded' });

    await sync([tx('rev-1', 'APPLE.COM/BILL', '2026-11-20', 299)], '2026-11-25');
    const after = await loadHome(db, '2026-11-25');
    expect(after.toReview.find((r) => r.name === 'iCloud+')?.bank).toBeNull();
  });
});
