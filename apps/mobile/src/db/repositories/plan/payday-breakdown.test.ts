import { paydayBreakdown, paydayInputs, type PaydayRow } from './payday-breakdown';

const row = (over: Partial<PaydayRow>): PaydayRow => ({
  subscription_id: 'm',
  due_date: '2026-12-05',
  funded_amount_cents: 1000,
  status: 'planned',
  provision_only: 0,
  actual_date: null,
  name: 'Mensuel',
  period_unit: 'month',
  period_count: 1,
  ...over,
});

describe('paydayInputs', () => {
  it('sépare mensuels et abonnements longs', () => {
    const rows = [
      row({}),
      row({ subscription_id: 'y', name: 'Annuel', period_unit: 'year', due_date: '2027-06-01', funded_amount_cents: 12000 }),
    ];
    const { monthlyCharges, provisioned } = paydayInputs(rows);
    expect(monthlyCharges).toEqual([{ subscriptionId: 'm', dueDate: '2026-12-05', fundedAmountCents: 1000, status: 'planned' }]);
    expect(provisioned).toHaveLength(1);
    expect(provisioned[0]).toMatchObject({ subscriptionId: 'y', periodMonths: 12, provisionedCents: 0 });
  });

  it('ne compte que les provisions versées après le dernier paiement', () => {
    const annual = { subscription_id: 'y', period_unit: 'year' as const };
    const rows = [
      row({ ...annual, status: 'paid', actual_date: '2026-06-02', due_date: '2026-06-01' }),
      row({ ...annual, provision_only: 1, status: 'funded', due_date: '2026-05-25', funded_amount_cents: 1000 }),
      row({ ...annual, provision_only: 1, status: 'funded', due_date: '2026-07-25', funded_amount_cents: 1000 }),
      row({ ...annual, provision_only: 1, status: 'funded', due_date: '2026-08-25', funded_amount_cents: 1000 }),
    ];
    const { provisioned } = paydayInputs(rows);
    expect(provisioned[0].provisionedCents).toBe(2000);
    expect(provisioned[0].charges).toHaveLength(1);
  });
});

describe('paydayBreakdown', () => {
  it('cumule les prélèvements et nomme provisions et compléments', () => {
    const result = paydayBreakdown(
      {
        totalCents: 4500,
        lines: [
          { kind: 'charge', subscriptionId: 'm', dueDate: '2026-12-05', amountCents: 1000 },
          { kind: 'charge', subscriptionId: 'n', dueDate: '2026-12-06', amountCents: 500 },
          { kind: 'provision', subscriptionId: 'y', amountCents: 2000 },
          { kind: 'complement', subscriptionId: 'z', dueDate: '2026-12-10', amountCents: 1000 },
        ],
      },
      new Map([['y', 'Annuel']]),
    );
    expect(result).toEqual({
      totalCents: 4500,
      lines: [
        { kind: 'charges', subscriptionId: null, name: null, amountCents: 1500 },
        { kind: 'provision', subscriptionId: 'y', name: 'Annuel', amountCents: 2000 },
        { kind: 'complement', subscriptionId: 'z', name: null, amountCents: 1000 },
      ],
    });
  });
});
