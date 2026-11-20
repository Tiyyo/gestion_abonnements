import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { consentUrl, finishConsent, startConsent } from './consent-client';
import { ConsentError } from './consent-error';
import { consentErrorResponseSchema, consentFinishResponseSchema, consentStartResponseSchema } from './consent-schema';

const fixture = (file: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'contracts', 'fixtures', file), 'utf8'));

const config = { url: 'https://fn.example/balances', secret: 's3cret' };
const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const kindOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'ok',
    (error: unknown) => (error instanceof ConsentError ? error.kind : 'autre'),
  );

describe('contrat /consent', () => {
  it('accepte les sorties du serveur Go', () => {
    expect(consentStartResponseSchema.safeParse(fixture('consent-start.response.json')).success).toBe(true);
    expect(consentFinishResponseSchema.safeParse(fixture('consent-finish.response.json')).success).toBe(true);
    expect(consentErrorResponseSchema.safeParse(fixture('consent-error.response.json')).success).toBe(true);
  });

  it.each([
    ['adresse non https', { url: 'http://bank.example', state: `0.${'a'.repeat(32)}` }],
    ['state mal formé', { url: 'https://bank.example', state: 'abc' }],
    ['champ en trop', { url: 'https://bank.example', state: `0.${'a'.repeat(32)}`, extra: 1 }],
  ])('refuse un départ : %s', (_label, body) => {
    expect(consentStartResponseSchema.safeParse(body).success).toBe(false);
  });

  it.each([
    ['session mal formée', { sessionId: 'a/b' }],
    ['date illisible', { validUntil: 'demain' }],
    ['IBAN complet', { accounts: [{ ...fixture('consent-finish.response.json').accounts[0], ibanTail: 'FR7612345' }] }],
  ])('refuse une fin : %s', (_label, patch) => {
    expect(consentFinishResponseSchema.safeParse({ ...fixture('consent-finish.response.json'), ...patch }).success).toBe(false);
  });
});

describe('consentUrl', () => {
  it('ajoute l’étape à la route des soldes', () => {
    expect(consentUrl('https://fn.example/balances/', 'start')).toBe('https://fn.example/balances/consent/start');
    expect(consentUrl('https://fn.example', 'finish')).toBe('https://fn.example/consent/finish');
  });
});

describe('startConsent / finishConsent', () => {
  it('envoie le lien de retour, avec le secret', async () => {
    const fetchImpl = reply(fixture('consent-start.response.json'));
    await expect(startConsent(config, 'abonnements://consent', fetchImpl)).resolves.toEqual(fixture('consent-start.response.json'));
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe('https://fn.example/balances/consent/start');
    expect(JSON.parse(init.body)).toEqual({ returnUrl: 'abonnements://consent' });
    expect(init.headers.Authorization).toBe('Bearer s3cret');
  });

  it('échange le code contre la session', async () => {
    const fetchImpl = reply(fixture('consent-finish.response.json'));
    const session = await finishConsent(config, 'code-1', fetchImpl);
    expect(session.accounts).toHaveLength(2);
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ code: 'code-1' });
  });

  it('traduit les erreurs du serveur', async () => {
    expect(await kindOf(finishConsent(config, 'x', reply(fixture('consent-error.response.json'), 410)))).toBe('expired');
    expect(await kindOf(startConsent(config, 'r', reply({ error: 'x', code: 'redirect_not_allowed' }, 502)))).toBe('redirect_not_allowed');
    expect(await kindOf(startConsent(config, 'r', reply({ error: 'x', code: 'return_not_allowed' }, 400)))).toBe('return_not_allowed');
    expect(await kindOf(startConsent(config, 'r', reply({ error: 'x', code: 'not_configured' }, 503)))).toBe('not_configured');
    expect(await kindOf(startConsent(config, 'r', reply({ error: 'non autorisé' }, 401)))).toBe('not_configured');
    expect(await kindOf(startConsent(config, 'r', reply({ error: 'x', code: 'bank_unavailable' }, 502)))).toBe('bank');
    expect(await kindOf(startConsent(config, 'r', reply({ url: 'http://x' })))).toBe('bank');
  });

  it('signale une panne réseau', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    expect(await kindOf(finishConsent(config, 'x', offline))).toBe('network');
  });
});
