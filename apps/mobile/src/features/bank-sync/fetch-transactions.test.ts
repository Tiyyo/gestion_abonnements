import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConsentExpiredError } from '@/features/balances/consent-expired-error';
import { fetchTransactions } from './fetch-transactions';
import { transactionsResponseSchema } from './transactions-schema';

const config = { url: 'https://fn.example/transactions', secret: 's3cret' };
const fixture = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'contracts', 'fixtures', file), 'utf8')) as Record<string, unknown>;
const full = fixture('transactions.response.full.json') as { transactions: Record<string, unknown>[] };

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('contrat /transactions', () => {
  it.each(['transactions.response.full.json', 'transactions.response.empty.json'])('accepte la sortie du serveur Go (%s)', (file) => {
    expect(transactionsResponseSchema.safeParse(fixture(file)).success).toBe(true);
  });

  it('lit les montants en centimes entiers et les deux sens', () => {
    const parsed = transactionsResponseSchema.parse(full);
    expect(parsed.transactions[0]).toMatchObject({ id: 'rev-001', amountCents: 1349, direction: 'debit', status: 'booked' });
    expect(parsed.transactions.map((t) => t.direction)).toContain('credit');
    expect(parsed.transactions.map((t) => t.status)).toContain('pending');
  });

  const first = full.transactions[0]!;
  it.each([
    ['montant décimal', { ...first, amountCents: 13.49 }],
    ['montant négatif', { ...first, amountCents: -1349 }],
    ['sens inconnu', { ...first, direction: 'refund' }],
    ['statut inconnu', { ...first, status: 'cancelled' }],
    ['date mal formée', { ...first, bookingDate: '12/11/2026' }],
    ['identifiant vide', { ...first, id: '' }],
    ['champ en trop', { ...first, iban: 'FR76' }],
    ['champ manquant', { id: 'x', bookingDate: '2026-11-12', amountCents: 1 }],
  ])('refuse : %s', (_label, transaction) => {
    expect(transactionsResponseSchema.safeParse({ ...full, transactions: [transaction] }).success).toBe(false);
  });
});

describe('fetchTransactions', () => {
  it('appelle la route avec la date de début et le secret', async () => {
    const fetchImpl = respond(200, full);
    const result = await fetchTransactions(config, '2026-11-10', fetchImpl);
    expect(result.transactions).toHaveLength(full.transactions.length);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fn.example/transactions?from=2026-11-10',
      expect.objectContaining({ headers: { Authorization: 'Bearer s3cret' } }),
    );
  });

  it('signale un accord expiré', async () => {
    await expect(fetchTransactions(config, '2026-11-10', respond(409, { error: 'accord' }))).rejects.toBeInstanceOf(ConsentExpiredError);
  });

  it('échoue sur une erreur serveur ou une réponse hors contrat', async () => {
    await expect(fetchTransactions(config, '2026-11-10', respond(502, { error: 'x' }))).rejects.toThrow('mouvements indisponibles (502)');
    await expect(fetchTransactions(config, '2026-11-10', respond(200, { transactions: [] }))).rejects.toThrow();
  });
});
