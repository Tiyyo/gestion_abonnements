import { ConsentExpiredError, daysUntil, fetchBalances, vaultShortfallCents } from './balances';
import { balancesUrl } from './function-config';

const config = { url: 'https://fn.example/balances', secret: 's3cret' };
const payload = {
  current: { amountCents: 1458, currency: 'EUR' },
  vault: { amountCents: 8627, currency: 'EUR' },
  consentValidUntil: '2027-05-17T14:30:41.889Z',
  fetchedAt: '2026-11-19T14:40:00Z',
};

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('balancesUrl', () => {
  it('ajoute la route sans doubler la barre', () => {
    expect(balancesUrl('https://fn.example/')).toBe('https://fn.example/balances');
    expect(balancesUrl('https://fn.example')).toBe('https://fn.example/balances');
  });
});

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

describe('calculs', () => {
  it('compte les jours restants avant la fin de l’accord', () => {
    expect(daysUntil('2027-05-17T14:30:41Z', new Date('2027-05-03T10:00:00Z'))).toBe(14);
  });

  it('calcule ce qui manque au coffre pour les transferts à venir', () => {
    expect(vaultShortfallCents(8627, 819)).toBe(0);
    expect(vaultShortfallCents(500, 819)).toBe(319);
  });
});
