import type { SubscriptionSnapshot } from '@abonnements/core';
import { closedPastDueCount, firstDueOnOrAfter } from './due-dates';

const monthly: SubscriptionSnapshot = {
  id: 's1',
  status: 'active',
  paymentMethod: 'revolut',
  amountCents: 999,
  periodUnit: 'month',
  periodCount: 1,
  anchorDay: 5,
  nextChargeDate: '2026-08-05',
  trialEndDate: null,
  postTrialAmountCents: null,
  periodEndDate: null,
  marginOverrideBp: null,
  archived: false,
};

describe('firstDueOnOrAfter', () => {
  it('saute les échéances passées en partant de la suivante', () => {
    expect(firstDueOnOrAfter(monthly, '2026-11-20')).toBe('2026-12-05');
  });

  it('garde une échéance tombant aujourd’hui', () => {
    expect(firstDueOnOrAfter(monthly, '2026-09-05')).toBe('2026-09-05');
  });

  it('ne revient jamais avant la n-ième échéance demandée', () => {
    expect(firstDueOnOrAfter(monthly, '2026-01-01')).toBe('2026-09-05');
    expect(firstDueOnOrAfter(monthly, '2026-01-01', 0)).toBe('2026-08-05');
  });
});

describe('closedPastDueCount', () => {
  it('compte les échéances passées déjà closes', () => {
    expect(closedPastDueCount(monthly, '2026-11-20', new Set(['2026-08-05', '2026-09-05']))).toBe(2);
  });

  it('s’arrête à la première échéance passée encore ouverte', () => {
    expect(closedPastDueCount(monthly, '2026-11-20', new Set(['2026-08-05', '2026-10-05']))).toBe(1);
  });

  it('s’arrête aux échéances à venir même closes', () => {
    expect(closedPastDueCount(monthly, '2026-08-05', new Set(['2026-08-05']))).toBe(0);
  });
});
