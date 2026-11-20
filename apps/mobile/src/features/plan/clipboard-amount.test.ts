import { clipboardAmount } from './clipboard-amount';

describe('clipboardAmount', () => {
  it('écrit le montant avec une virgule et deux décimales', () => {
    expect(clipboardAmount(803)).toBe('8,03');
    expect(clipboardAmount(1235)).toBe('12,35');
    expect(clipboardAmount(1200)).toBe('12,00');
    expect(clipboardAmount(5)).toBe('0,05');
  });

  it('n’ajoute ni symbole, ni espace, ni séparateur de milliers', () => {
    expect(clipboardAmount(123456)).toBe('1234,56');
    expect(clipboardAmount(100000000)).toBe('1000000,00');
  });

  it('retombe sur zéro pour un montant négatif ou non entier', () => {
    expect(clipboardAmount(-803)).toBe('0,00');
    expect(clipboardAmount(8.5)).toBe('0,00');
    expect(clipboardAmount(Number.NaN)).toBe('0,00');
  });
});
