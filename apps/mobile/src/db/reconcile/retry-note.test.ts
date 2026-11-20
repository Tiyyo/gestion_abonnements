import { isPostponed, RETRY_NOTE } from './retry-note';

const note = (chargeId: string, reviewAgainOn: string) => JSON.stringify({ kind: RETRY_NOTE, chargeId, reviewAgainOn });

describe('isPostponed', () => {
  it('reporte tant que la date de nouvelle revue est à venir', () => {
    expect(isPostponed([note('c1', '2026-11-25')], 'c1', '2026-11-20')).toBe(true);
  });

  it('ne reporte plus le jour de la nouvelle revue', () => {
    expect(isPostponed([note('c1', '2026-11-20')], 'c1', '2026-11-20')).toBe(false);
  });

  it('ignore les notes d’un autre prélèvement ou d’un autre type', () => {
    expect(isPostponed([note('c2', '2026-11-25')], 'c1', '2026-11-20')).toBe(false);
    expect(isPostponed([JSON.stringify({ kind: 'autre', chargeId: 'c1', reviewAgainOn: '2026-11-25' })], 'c1', '2026-11-20')).toBe(false);
  });
});
