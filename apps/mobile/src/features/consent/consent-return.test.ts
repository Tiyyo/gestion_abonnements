import { ConsentError } from './consent-error';
import { checkReturn, parseReturnUrl, PENDING_TTL_MS } from './consent-return';

const APK = 'abonnements://consent';
const pending = { state: '0.abc', startedAt: 1_000_000 };
const kindOf = (fn: () => unknown) => {
  try {
    fn();
    return 'ok';
  } catch (error) {
    return error instanceof ConsentError ? error.kind : 'autre';
  }
};

describe('parseReturnUrl', () => {
  it('lit le code et le state du retour de la banque', () => {
    expect(parseReturnUrl('abonnements://consent?code=a%2Bb&state=0.abc', APK)).toEqual({ code: 'a+b', state: '0.abc', error: null });
    expect(parseReturnUrl('exp://192.168.1.2:8081/--/consent?error=access_denied&state=1.x', 'exp://192.168.1.2:8081/--/consent')).toEqual({
      code: null,
      state: '1.x',
      error: 'access_denied',
    });
  });

  it('ignore les autres liens', () => {
    expect(parseReturnUrl('abonnements://charges/12?code=x', APK)).toBeNull();
    expect(parseReturnUrl('abonnements://consent', APK)).toBeNull();
    expect(parseReturnUrl('abonnements://consentement?code=x', APK)).toBeNull();
  });

  it('garde la première valeur d’un paramètre répété', () => {
    expect(parseReturnUrl('abonnements://consent?code=a&code=b&state=s', APK)?.code).toBe('a');
  });
});

describe('checkReturn', () => {
  it('renvoie le code quand le state est celui de la demande', () => {
    expect(checkReturn({ code: 'c', state: '0.abc', error: null }, pending, pending.startedAt + 1000)).toBe('c');
  });

  it('refuse un state étranger, même pour une erreur', () => {
    expect(kindOf(() => checkReturn({ code: 'c', state: '0.zzz', error: null }, pending, pending.startedAt))).toBe('state_mismatch');
    expect(kindOf(() => checkReturn({ code: null, state: '0.zzz', error: 'access_denied' }, pending, pending.startedAt))).toBe(
      'state_mismatch',
    );
    expect(kindOf(() => checkReturn({ code: 'c', state: null, error: null }, pending, pending.startedAt))).toBe('state_mismatch');
    expect(kindOf(() => checkReturn({ code: 'c', state: '0.abc', error: null }, null, pending.startedAt))).toBe('state_mismatch');
  });

  it('reconnaît un refus ou une annulation à la banque', () => {
    expect(kindOf(() => checkReturn({ code: null, state: '0.abc', error: 'access_denied' }, pending, pending.startedAt))).toBe('cancelled');
    expect(kindOf(() => checkReturn({ code: null, state: '0.abc', error: 'server_error' }, pending, pending.startedAt))).toBe('bank');
  });

  it('abandonne une demande trop ancienne', () => {
    expect(kindOf(() => checkReturn({ code: 'c', state: '0.abc', error: null }, pending, pending.startedAt + PENDING_TTL_MS + 1))).toBe(
      'expired',
    );
  });
});
