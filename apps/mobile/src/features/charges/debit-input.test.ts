import {
  defaultDebitDate,
  isReviewDirty,
  isUnknownDebitDirty,
  isValidAmountInput,
  retryShortfallCents,
  unknownDebitLabel,
} from './debit-input';

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

describe('isUnknownDebitDirty', () => {
  const today = '2026-11-20';

  it('ne voit aucune saisie sur le formulaire tel qu’il s’ouvre', () => {
    expect(isUnknownDebitDirty({ name: '', amount: '', date: today }, today)).toBe(false);
    expect(isUnknownDebitDirty({ name: '   ', amount: ' ', date: today }, today)).toBe(false);
  });

  it('voit une saisie dès qu’un nom ou un montant est tapé, même invalide', () => {
    expect(isUnknownDebitDirty({ name: 'N', amount: '', date: today }, today)).toBe(true);
    expect(isUnknownDebitDirty({ name: '', amount: '9,', date: today }, today)).toBe(true);
  });

  it('voit une saisie quand seule la date a changé', () => {
    expect(isUnknownDebitDirty({ name: '', amount: '', date: '2026-11-18' }, today)).toBe(true);
  });
});

describe('isReviewDirty', () => {
  const initial = { amount: '12,99', date: '2026-11-19' };

  it('ne voit aucune saisie sur les valeurs proposées', () => {
    expect(isReviewDirty({ ...initial }, initial)).toBe(false);
    expect(isReviewDirty({ amount: ' 12,99 ', date: '2026-11-19' }, initial)).toBe(false);
  });

  it('voit une saisie quand le montant ou la date diffère', () => {
    expect(isReviewDirty({ ...initial, amount: '13,99' }, initial)).toBe(true);
    expect(isReviewDirty({ ...initial, amount: '' }, initial)).toBe(true);
    expect(isReviewDirty({ ...initial, date: '2026-11-20' }, initial)).toBe(true);
  });

  it('oublie une modification annulée à la main', () => {
    expect(isReviewDirty({ amount: '12,99', date: '2026-11-19' }, initial)).toBe(false);
  });
});
