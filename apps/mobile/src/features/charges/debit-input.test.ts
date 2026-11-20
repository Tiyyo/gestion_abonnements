import { defaultDebitDate, isValidAmountInput, retryShortfallCents, unknownDebitLabel } from './debit-input';

describe('isValidAmountInput', () => {
  it('accepte virgule, point et espaces autour', () => {
    expect(isValidAmountInput('9,99')).toBe(true);
    expect(isValidAmountInput(' 12.5 ')).toBe(true);
    expect(isValidAmountInput('120')).toBe(true);
  });

  it('refuse zéro, vide et formats invalides', () => {
    expect(isValidAmountInput('0')).toBe(false);
    expect(isValidAmountInput('0,00')).toBe(false);
    expect(isValidAmountInput('')).toBe(false);
    expect(isValidAmountInput('9,999')).toBe(false);
    expect(isValidAmountInput('abc')).toBe(false);
    expect(isValidAmountInput('1234567')).toBe(false);
  });
});

describe('defaultDebitDate', () => {
  it('garde une date prévue passée et ramène une date future à aujourd’hui', () => {
    expect(defaultDebitDate('2026-11-10', '2026-11-20')).toBe('2026-11-10');
    expect(defaultDebitDate('2026-11-25', '2026-11-20')).toBe('2026-11-20');
    expect(defaultDebitDate('2026-11-20', '2026-11-20')).toBe('2026-11-20');
  });
});

describe('retryShortfallCents', () => {
  it('renvoie la différence seulement si le prix a augmenté', () => {
    expect(retryShortfallCents(1299, 1030)).toBe(269);
    expect(retryShortfallCents(1030, 1030)).toBeNull();
    expect(retryShortfallCents(0, 1030)).toBeNull();
  });
});

describe('unknownDebitLabel', () => {
  it('décrit chaque type d’événement', () => {
    expect(unknownDebitLabel('duplicate')).toBe('Double prélèvement enregistré. Réclame un remboursement au marchand.');
    expect(unknownDebitLabel('unexpected_charge')).toBe('Prélèvement inattendu enregistré.');
    expect(unknownDebitLabel('autre')).toBe('Débit enregistré.');
  });
});
