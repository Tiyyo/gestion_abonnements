import { monthOf, shiftMonth } from './month';

describe('monthOf', () => {
  it('lit l’année et le mois d’une date', () => {
    expect(monthOf('2026-11-20')).toEqual([2026, 11]);
    expect(monthOf('2027-01-05')).toEqual([2027, 1]);
  });
});

describe('shiftMonth', () => {
  it('avance et recule dans la même année', () => {
    expect(shiftMonth(2026, 5, 1)).toEqual([2026, 6]);
    expect(shiftMonth(2026, 5, -1)).toEqual([2026, 4]);
  });

  it('passe d’une année à l’autre', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual([2027, 1]);
    expect(shiftMonth(2027, 1, -1)).toEqual([2026, 12]);
    expect(shiftMonth(2026, 3, -15)).toEqual([2024, 12]);
  });
});
