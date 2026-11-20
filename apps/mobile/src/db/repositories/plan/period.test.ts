import { lastDayOfMonth, monthKey, periodForMonth, shiftMonth } from './period';

describe('shiftMonth', () => {
  it('passe d’une année à l’autre dans les deux sens', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual([2027, 1]);
    expect(shiftMonth(2026, 1, -1)).toEqual([2025, 12]);
    expect(shiftMonth(2026, 11, 2)).toEqual([2027, 1]);
  });
});

describe('periodForMonth', () => {
  it('va du jour de paie du mois à celui du mois suivant', () => {
    expect(periodForMonth(2026, 12, 25)).toEqual({ start: '2026-12-28', end: '2027-01-25' });
  });
});

describe('lastDayOfMonth', () => {
  it('tient compte des années bissextiles', () => {
    expect(lastDayOfMonth(2028, 2)).toBe('2028-02-29');
    expect(lastDayOfMonth(2026, 11)).toBe('2026-11-30');
    expect(monthKey(2026, 3)).toBe('2026-03');
  });
});
