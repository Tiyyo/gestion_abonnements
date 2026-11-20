import { paydayDoneFeedback, rescheduleFeedback, transferDoneFeedback } from './plan-feedback';

const planned = { id: 't1', rescheduled: false, effectiveDate: '2026-11-18' };
const moved = { id: 't1', rescheduled: true, effectiveDate: '2026-11-19' };

describe('transferDoneFeedback', () => {
  it('propose de remettre le transfert à faire', () => {
    const feedback = transferDoneFeedback('t1');
    expect(feedback.message).toBe('Transfert marqué fait.');
    expect(feedback.undo(null)).toEqual({ type: 'transfer_undo', transferId: 't1' });
  });
});

describe('rescheduleFeedback', () => {
  it('annuler un premier report revient à la date calculée', () => {
    const feedback = rescheduleFeedback(planned, '2026-11-19');
    expect(feedback?.message).toBe('Transfert reporté au 19\u00a0nov.');
    expect(feedback?.undo(null)).toEqual({ type: 'reschedule', transferId: 't1', date: null });
  });

  it('annuler un second report revient au report précédent', () => {
    const feedback = rescheduleFeedback(moved, '2026-11-20');
    expect(feedback?.undo(null)).toEqual({ type: 'reschedule', transferId: 't1', date: '2026-11-19' });
  });

  it('annuler une annulation de report rétablit le report', () => {
    const feedback = rescheduleFeedback(moved, null);
    expect(feedback?.message).toBe('Report annulé.');
    expect(feedback?.undo(null)).toEqual({ type: 'reschedule', transferId: 't1', date: '2026-11-19' });
  });

  it('ne dit rien quand la date ne change pas', () => {
    expect(rescheduleFeedback(planned, null)).toBeNull();
    expect(rescheduleFeedback(moved, '2026-11-19')).toBeNull();
  });
});

describe('paydayDoneFeedback', () => {
  it('annule le virement qui vient d’être créé', () => {
    expect(paydayDoneFeedback().undo('p1')).toEqual({ type: 'payday_undo', transferId: 'p1' });
  });

  it('ne propose rien si le virement existait déjà', () => {
    expect(paydayDoneFeedback().undo(null)).toBeNull();
  });
});
