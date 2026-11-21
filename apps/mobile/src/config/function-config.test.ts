import { balancesUrl, readTransactionsConfig, transactionsUrl } from './function-config';

describe('balancesUrl', () => {
  it('ajoute la route sans doubler la barre', () => {
    expect(balancesUrl('https://fn.example/')).toBe('https://fn.example/balances');
    expect(balancesUrl('https://fn.example')).toBe('https://fn.example/balances');
  });
});

describe('readTransactionsConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('dérive la route de la fonction /enrich', () => {
    expect(transactionsUrl('https://fn.example/')).toBe('https://fn.example/transactions');
    vi.stubEnv('EXPO_PUBLIC_ENRICH_URL', 'https://fn.example/');
    vi.stubEnv('EXPO_PUBLIC_ENRICH_SECRET', 's3cret');
    vi.stubEnv('EXPO_PUBLIC_TRANSACTIONS_URL', '');
    expect(readTransactionsConfig()).toEqual({ url: 'https://fn.example/transactions', secret: 's3cret' });
  });

  it('préfère l’adresse de la fonction dédiée', () => {
    vi.stubEnv('EXPO_PUBLIC_ENRICH_URL', 'https://fn.example');
    vi.stubEnv('EXPO_PUBLIC_ENRICH_SECRET', 's3cret');
    vi.stubEnv('EXPO_PUBLIC_TRANSACTIONS_URL', 'https://tx.example');
    expect(readTransactionsConfig()).toEqual({ url: 'https://tx.example', secret: 's3cret' });
  });

  it('reste absente sans adresse ni secret', () => {
    vi.stubEnv('EXPO_PUBLIC_ENRICH_URL', '');
    vi.stubEnv('EXPO_PUBLIC_ENRICH_SECRET', '');
    expect(readTransactionsConfig()).toBeNull();
  });
});
