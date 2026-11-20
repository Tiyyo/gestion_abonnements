import { keptRescheduledDate } from './kept-reschedule';

describe('keptRescheduledDate', () => {
  it('garde un report qui reste avant le premier prélèvement', () => {
    expect(keptRescheduledDate('2026-12-04', ['2026-12-08', '2026-12-05'], '2026-12-03')).toBe('2026-12-04');
  });

  it('garde un report le jour même du premier prélèvement', () => {
    expect(keptRescheduledDate('2026-12-05', ['2026-12-08', '2026-12-05'], '2026-12-03')).toBe('2026-12-05');
  });

  it('abandonne un report qui dépasse le premier prélèvement', () => {
    expect(keptRescheduledDate('2026-12-06', ['2026-12-08', '2026-12-05'], '2026-12-03')).toBeNull();
  });

  it('se rabat sur la date prévue sans prélèvement', () => {
    expect(keptRescheduledDate('2026-12-03', [], '2026-12-03')).toBe('2026-12-03');
    expect(keptRescheduledDate('2026-12-04', [], '2026-12-03')).toBeNull();
  });

  it('rend null sans report', () => {
    expect(keptRescheduledDate(null, ['2026-12-05'], '2026-12-03')).toBeNull();
  });
});
