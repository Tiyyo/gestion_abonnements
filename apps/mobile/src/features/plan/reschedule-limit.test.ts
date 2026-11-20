import { rescheduleLimit, rescheduleValue } from './reschedule-limit';

const charge = (dueDate: string) => ({ name: 'X', dueDate, expectedAmountCents: 999, marginBp: 300 });

describe('rescheduleLimit', () => {
  it('retient le premier prélèvement financé', () => {
    expect(rescheduleLimit({ plannedDate: '2026-11-09', charges: [charge('2026-11-12'), charge('2026-11-10')] })).toBe('2026-11-10');
  });

  it('retombe sur la date prévue sans prélèvement', () => {
    expect(rescheduleLimit({ plannedDate: '2026-11-09', charges: [] })).toBe('2026-11-09');
  });
});

describe('rescheduleValue', () => {
  it('annule le report quand on revient à la date prévue', () => {
    expect(rescheduleValue('2026-11-09', '2026-11-09')).toBeNull();
    expect(rescheduleValue('2026-11-10', '2026-11-09')).toBe('2026-11-10');
  });
});
