import { generateCharges } from './charges';
import type { SubscriptionSnapshot } from './types';

const context = { today: '2026-11-17', globalMarginBp: 300 };

function subscription(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    id: 'spotify',
    status: 'active',
    paymentMethod: 'revolut',
    amountCents: 1199,
    periodUnit: 'month',
    periodCount: 1,
    anchorDay: 21,
    nextChargeDate: '2026-11-21',
    trialEndDate: null,
    postTrialAmountCents: null,
    periodEndDate: null,
    marginOverrideBp: null,
    archived: false,
    ...overrides,
  };
}

describe('generateCharges', () => {
  it('génère 13 mois de prélèvements mensuels financés avec la marge', () => {
    const charges = generateCharges(subscription(), context);
    expect(charges).toHaveLength(13);
    expect(charges[0]).toEqual({
      subscriptionId: 'spotify',
      dueDate: '2026-11-21',
      expectedAmountCents: 1199,
      fundedAmountCents: 1235,
      status: 'planned',
      isTrialConversion: false,
    });
    expect(charges.at(-1)?.dueDate).toBe('2027-11-21');
  });

  it('garde le jour 31 en fin de mois sans dérive', () => {
    const dates = generateCharges(subscription({ anchorDay: 31, nextChargeDate: '2026-12-31' }), context)
      .slice(0, 4)
      .map((c) => c.dueDate);
    expect(dates).toEqual(['2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31']);
  });

  it('gère les périodes trimestrielles, annuelles et hebdomadaires', () => {
    const quarterly = generateCharges(subscription({ periodCount: 3 }), context).map((c) => c.dueDate);
    expect(quarterly).toEqual(['2026-11-21', '2027-02-21', '2027-05-21', '2027-08-21', '2027-11-21']);

    const yearly = generateCharges(
      subscription({ periodUnit: 'year', anchorDay: 3, nextChargeDate: '2027-03-03', amountCents: 5000 }),
      context,
    );
    expect(yearly.map((c) => c.dueDate)).toEqual(['2027-03-03']);
    expect(yearly[0]?.fundedAmountCents).toBe(5150);

    const weekly = generateCharges(subscription({ periodUnit: 'week', anchorDay: null, nextChargeDate: '2026-11-18' }), context);
    expect(weekly.slice(0, 3).map((c) => c.dueDate)).toEqual(['2026-11-18', '2026-11-25', '2026-12-02']);
  });

  it('applique la surcharge de marge', () => {
    expect(generateCharges(subscription({ marginOverrideBp: 0 }), context)[0]?.fundedAmountCents).toBe(1199);
    expect(generateCharges(subscription({ marginOverrideBp: 500 }), context)[0]?.fundedAmountCents).toBe(1259);
  });

  it('ne génère que la conversion, non financée, pour un essai', () => {
    const charges = generateCharges(
      subscription({ id: 'disney', status: 'trial', trialEndDate: '2026-11-20', postTrialAmountCents: 999 }),
      context,
    );
    expect(charges).toEqual([
      {
        subscriptionId: 'disney',
        dueDate: '2026-11-20',
        expectedAmountCents: 999,
        fundedAmountCents: 0,
        status: 'unfunded',
        isTrialConversion: true,
      },
    ]);
  });

  it('ne finance plus rien après la fin de période d’un abonnement à résilier', () => {
    const charges = generateCharges(
      subscription({ id: 'vpn', status: 'to_cancel', amountCents: 499, nextChargeDate: '2026-11-21', periodEndDate: '2026-12-20' }),
      context,
    );
    expect(charges.slice(0, 3).map((c) => [c.dueDate, c.status, c.fundedAmountCents])).toEqual([
      ['2026-11-21', 'planned', 514],
      ['2026-12-21', 'unfunded', 0],
      ['2027-01-21', 'unfunded', 0],
    ]);
  });

  it('ne génère rien pour un abonnement résilié, archivé ou payé hors Revolut', () => {
    expect(generateCharges(subscription({ status: 'cancelled' }), context)).toEqual([]);
    expect(generateCharges(subscription({ archived: true }), context)).toEqual([]);
    expect(generateCharges(subscription({ paymentMethod: 'other' }), context)).toEqual([]);
  });
});
