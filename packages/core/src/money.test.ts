import { effectiveMarginBp, formatEuros, fundedAmountCents, InvalidAmountError } from './money';

describe('fundedAmountCents', () => {
  it.each([
    [299, 300, 308],
    [1199, 300, 1235],
    [1349, 300, 1390],
    [999, 300, 1029],
    [5000, 300, 5150],
  ])('%i centimes avec %i bp donnent %i (cas des maquettes)', (expected, margin, funded) => {
    expect(fundedAmountCents(expected, margin)).toBe(funded);
  });

  it('ne change rien avec une marge à 0 %', () => {
    expect(fundedAmountCents(1199, 0)).toBe(1199);
  });

  it('applique le plafond de 5 %', () => {
    expect(fundedAmountCents(1000, 500)).toBe(1050);
  });

  it('arrondit au centime supérieur', () => {
    expect(fundedAmountCents(1, 300)).toBe(2);
    expect(fundedAmountCents(100, 1)).toBe(101);
  });

  it('refuse une marge au-delà de 5 %', () => {
    expect(() => fundedAmountCents(1000, 501)).toThrow(InvalidAmountError);
  });

  it('refuse un montant non entier', () => {
    expect(() => fundedAmountCents(9.99, 300)).toThrow(InvalidAmountError);
  });
});

describe('effectiveMarginBp', () => {
  it('prend la surcharge si elle existe', () => {
    expect(effectiveMarginBp(0, 300)).toBe(0);
    expect(effectiveMarginBp(450, 300)).toBe(450);
  });

  it('prend la marge globale sinon', () => {
    expect(effectiveMarginBp(null, 300)).toBe(300);
  });
});

describe('formatEuros', () => {
  it('formate à la française', () => {
    expect(formatEuros(308)).toBe('3,08\u202f€');
    expect(formatEuros(39164)).toBe('391,64\u202f€');
    expect(formatEuros(123456)).toBe('1\u202f234,56\u202f€');
    expect(formatEuros(-86)).toBe('−0,86\u202f€');
  });
});
