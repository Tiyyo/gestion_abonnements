import { groupTransfers, paydayDate, transferDate } from './funding';

describe('transferDate', () => {
  it('transfère la veille d’un prélèvement en semaine', () => {
    expect(transferDate('2026-11-19', 1)).toBe('2026-11-18');
  });

  it('transfère le vendredi pour un prélèvement le samedi', () => {
    expect(transferDate('2026-11-21', 1)).toBe('2026-11-20');
  });

  it('transfère le vendredi pour un prélèvement le lundi (J-3)', () => {
    expect(transferDate('2026-11-23', 1)).toBe('2026-11-20');
  });

  it('recule avant un jour férié', () => {
    expect(transferDate('2026-11-12', 1)).toBe('2026-11-10');
    expect(transferDate('2026-05-26', 1)).toBe('2026-05-22');
  });

  it('respecte un délai de deux jours', () => {
    expect(transferDate('2026-11-19', 2)).toBe('2026-11-17');
  });
});

describe('paydayDate', () => {
  it('reporte au jour ouvré suivant', () => {
    expect(paydayDate(2026, 11, 1)).toBe('2026-11-02');
    expect(paydayDate(2026, 8, 1)).toBe('2026-08-03');
  });

  it('ramène au dernier jour d’un mois court', () => {
    expect(paydayDate(2027, 2, 31)).toBe('2027-03-01');
    expect(paydayDate(2026, 4, 31)).toBe('2026-04-30');
  });
});

describe('groupTransfers', () => {
  const charges = [
    { name: 'iCloud+', dueDate: '2026-11-19', fundedAmountCents: 308, status: 'planned' },
    { name: 'Spotify', dueDate: '2026-11-21', fundedAmountCents: 1235, status: 'planned' },
    { name: 'Autre', dueDate: '2026-11-22', fundedAmountCents: 500, status: 'planned' },
    { name: 'Netflix', dueDate: '2026-11-24', fundedAmountCents: 1390, status: 'planned' },
    { name: 'Disney+', dueDate: '2026-11-20', fundedAmountCents: 0, status: 'unfunded' },
  ];

  it('regroupe par date de transfert et ignore les charges non financées', () => {
    const transfers = groupTransfers(charges, 1);
    expect(transfers.map((t) => [t.plannedDate, t.amountCents, t.charges.map((c) => c.name)])).toEqual([
      ['2026-11-18', 308, ['iCloud+']],
      ['2026-11-20', 1735, ['Spotify', 'Autre']],
      ['2026-11-23', 1390, ['Netflix']],
    ]);
  });
});
