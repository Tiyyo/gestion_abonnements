import { accountHint, accountLabel, accountName, suggestMapping } from './account-mapping';
import { bankLinkSchema, buildBankLink, parseStored } from './bank-link';
import type { ConsentAccount, ConsentSession } from './consent-schema';
import { consentErrorMessage } from './consent-wording';

const account = (uid: string, patch: Partial<ConsentAccount> = {}): ConsentAccount => ({
  uid,
  name: '',
  ibanTail: '',
  currency: 'EUR',
  product: '',
  cashAccountType: '',
  identificationHash: `hash-${uid}`,
  ...patch,
});

const current = account('acc-1', { name: 'Compte courant', cashAccountType: 'CACC', ibanTail: '0185' });
const vault = account('acc-2', { name: 'Abonnements', product: 'Coffre', cashAccountType: 'SVGS' });
const travel = account('acc-3', { name: 'Voyages', product: 'Coffre', cashAccountType: 'SVGS' });
const usd = account('acc-4', { name: 'Compte USD', currency: 'USD', cashAccountType: 'CACC' });

describe('suggestMapping', () => {
  it('associe sans demander un compte courant et un coffre seuls de leur type', () => {
    expect(suggestMapping([vault, current], null)).toEqual({ currentUid: 'acc-1', vaultUid: 'acc-2', certain: true });
  });

  it('retrouve les comptes déjà choisis par leur empreinte, même renumérotés', () => {
    const renewed = [
      account('new-1', { ...travel, uid: 'new-1' }),
      account('new-2', { ...vault, uid: 'new-2' }),
      account('new-3', { ...current, uid: 'new-3' }),
    ];
    expect(suggestMapping(renewed, { currentHash: 'hash-acc-1', vaultHash: 'hash-acc-2' })).toEqual({
      currentUid: 'new-3',
      vaultUid: 'new-2',
      certain: true,
    });
  });

  it('propose sans trancher quand plusieurs coffres sont partagés', () => {
    expect(suggestMapping([current, vault, travel], null)).toEqual({ currentUid: 'acc-1', vaultUid: null, certain: false });
  });

  it('propose sans trancher quand plusieurs comptes courants sont partagés', () => {
    expect(suggestMapping([current, usd, vault], null)).toEqual({ currentUid: null, vaultUid: 'acc-2', certain: false });
  });

  it('se rabat sur le nom quand le type manque', () => {
    const untyped = [account('a', { name: 'Principal' }), account('b', { name: 'Coffre abonnements' })];
    expect(suggestMapping(untyped, null)).toEqual({ currentUid: null, vaultUid: 'b', certain: false });
  });
});

describe('libellés des comptes', () => {
  it('nomme un compte par son nom, son produit ou la fin de son IBAN', () => {
    expect(accountLabel(current)).toBe('Compte courant');
    expect(accountLabel(account('x', { product: 'Coffre' }))).toBe('Coffre');
    expect(accountLabel(account('x', { ibanTail: '1234' }))).toBe('Compte ···1234');
    expect(accountLabel(account('x'))).toBe('Compte sans nom');
  });

  it('précise devise, produit et IBAN sans répéter le nom', () => {
    expect(accountHint(current)).toBe('EUR · ···0185');
    expect(accountHint(vault)).toBe('EUR · Coffre');
    expect(accountName([current], 'inconnu')).toBe('Choisir');
  });
});

describe('buildBankLink', () => {
  const session: ConsentSession = { sessionId: 'sess-1', validUntil: '2027-05-18T14:00:00Z', accounts: [current, vault] };

  it('garde la session, les deux comptes et leurs empreintes', () => {
    const link = buildBankLink(session, 'acc-1', 'acc-2');
    expect(link).toEqual({
      sessionId: 'sess-1',
      currentUid: 'acc-1',
      vaultUid: 'acc-2',
      currentHash: 'hash-acc-1',
      vaultHash: 'hash-acc-2',
      validUntil: '2027-05-18T14:00:00Z',
    });
    expect(parseStored(bankLinkSchema, JSON.stringify(link))).toEqual(link);
  });

  it('refuse un compte absent ou deux fois le même', () => {
    expect(buildBankLink(session, 'acc-1', 'acc-9')).toBeNull();
    expect(buildBankLink(session, 'acc-1', 'acc-1')).toBeNull();
    expect(buildBankLink(session, null, 'acc-2')).toBeNull();
  });

  it('ignore une valeur stockée illisible', () => {
    expect(parseStored(bankLinkSchema, null)).toBeNull();
    expect(parseStored(bankLinkSchema, '{pas du json')).toBeNull();
    expect(parseStored(bankLinkSchema, '{"sessionId":"x"}')).toBeNull();
  });
});

describe('consentErrorMessage', () => {
  it('rappelle le lien à autoriser quand la fonction refuse le retour', () => {
    expect(consentErrorMessage('return_not_allowed', 'exp://10.0.0.2:8081/--/consent').message).toContain('exp://10.0.0.2:8081/--/consent');
    expect(consentErrorMessage('cancelled').title).toBe('Autorisation annulée');
  });
});
