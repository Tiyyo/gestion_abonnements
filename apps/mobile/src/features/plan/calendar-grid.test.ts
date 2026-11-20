import { isInMonth, monthMatrix } from './calendar-grid';

describe('monthMatrix', () => {
  it('commence le lundi et couvre le mois en 6 semaines (novembre 2026, le 1er est un dimanche)', () => {
    const weeks = monthMatrix(2026, 11);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]![0]!.date).toBe('2026-10-26');
    expect(weeks[0]![6]).toMatchObject({ date: '2026-11-01', day: 1, inMonth: true, weekend: true, holiday: true });
    expect(weeks[5]![0]).toMatchObject({ date: '2026-11-30', inMonth: true });
    expect(weeks[5]![6]).toMatchObject({ date: '2026-12-06', inMonth: false });
  });

  it('tient en 4 semaines quand février commence un lundi (2027)', () => {
    const weeks = monthMatrix(2027, 2);
    expect(weeks).toHaveLength(4);
    expect(weeks[0]![0]!.date).toBe('2027-02-01');
    expect(weeks[3]![6]!.date).toBe('2027-02-28');
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
  });

  it('tient en 5 semaines et passe l’année (décembre 2026)', () => {
    const weeks = monthMatrix(2026, 12);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]![0]!.date).toBe('2026-11-30');
    expect(weeks[4]![6]).toMatchObject({ date: '2027-01-03', inMonth: false });
  });

  it('garde tous les jours autour du changement d’heure (mars et octobre)', () => {
    for (const month of [3, 10]) {
      const days = monthMatrix(2026, month)
        .flat()
        .filter((d) => d.inMonth)
        .map((d) => d.day);
      expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    }
  });

  it('marque les week-ends et les jours fériés', () => {
    const days = new Map(
      monthMatrix(2026, 11)
        .flat()
        .map((d) => [d.date, d]),
    );
    expect(days.get('2026-11-11')).toMatchObject({ weekend: false, holiday: true });
    expect(days.get('2026-11-14')).toMatchObject({ weekend: true, holiday: false });
    expect(days.get('2026-11-12')).toMatchObject({ weekend: false, holiday: false });
  });
});

describe('isInMonth', () => {
  it('compare l’année et le mois', () => {
    expect(isInMonth('2026-11-30', 2026, 11)).toBe(true);
    expect(isInMonth('2026-12-01', 2026, 11)).toBe(false);
    expect(isInMonth('2025-11-30', 2026, 11)).toBe(false);
    expect(isInMonth('2026-01-05', 2026, 1)).toBe(true);
  });
});
