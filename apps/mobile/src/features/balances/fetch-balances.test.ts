import { ConsentExpiredError } from './consent-expired-error';
import { fetchBalances } from './fetch-balances';

const config = { url: 'https://fn.example/balances', secret: 's3cret' };
const payload = {
  current: { amountCents: 1458, currency: 'EUR' },
  vault: { amountCents: 8627, currency: 'EUR' },
  consentValidUntil: '2027-05-17T14:30:41.889Z',
  fetchedAt: '2026-11-19T14:40:00Z',
};

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('fetchBalances', () => {
  it('appelle la route avec le secret et renvoie les soldes', async () => {
    const fetchImpl = respond(200, payload);
    await expect(fetchBalances(config, fetchImpl)).resolves.toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fn.example/balances',
      expect.objectContaining({ headers: { Authorization: 'Bearer s3cret' } }),
    );
  });

  it('signale un accord expiré', async () => {
    await expect(fetchBalances(config, respond(409, { error: 'accord' }))).rejects.toBeInstanceOf(ConsentExpiredError);
  });

  it('échoue sur une erreur serveur ou une réponse inattendue', async () => {
    await expect(fetchBalances(config, respond(502, { error: 'x' }))).rejects.toThrow('soldes indisponibles (502)');
    await expect(fetchBalances(config, respond(200, { current: 1 }))).rejects.toThrow();
  });
});
