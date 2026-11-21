import { RETRY_NOTE } from '@/db/reconcile/retry-note';
import type { BankContext } from '@/db/repositories/bank-transactions';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { chargesToReview } from './reviews';
import type { HomeChargeRow, HomeQuestion } from './types';
import { upcomingCharges } from './upcoming';

const charge = (id: string, dueDate: string, status: HomeChargeRow['status']): HomeChargeRow => ({
  id,
  subscription_id: `s-${id}`,
  due_date: dueDate,
  expected_amount_cents: 1000,
  funded_amount_cents: status === 'unfunded' ? 0 : 1030,
  status,
  is_trial_conversion: 0,
  provision_only: 0,
  actual_amount_cents: null,
  actual_date: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  name: `Abonnement ${id}`,
  subscription_status: 'active',
});

const today = '2026-11-20';
const noBank: BankContext = { coverage: null, suggestions: new Map(), unexpected: [] };

describe('chargesToReview', () => {
  const charges = [
    charge('passe', '2026-11-18', 'funded'),
    charge('essai', '2026-11-19', 'unfunded'),
    charge('reporte', '2026-11-17', 'funded'),
    charge('aujourdhui', '2026-11-20', 'funded'),
  ];
  const question: HomeQuestion = {
    kind: 'trial_outcome',
    subscriptionId: 's-essai',
    name: 'Essai',
    date: '2026-11-19',
    amountCents: 1000,
    chargeId: 'essai',
    cancelUrl: null,
  };
  const postponed = JSON.stringify({ kind: RETRY_NOTE, chargeId: 'reporte', reviewAgainOn: '2026-11-22' });

  it('garde les échéances passées, hors questions et reports', () => {
    expect(chargesToReview(charges, [question], [postponed], today, noBank).map((r) => r.chargeId)).toEqual(['passe']);
  });

  it('signale un prélèvement non voulu', () => {
    const [review] = chargesToReview([charges[1]], [], [], today, noBank);
    expect(review).toMatchObject({ chargeId: 'essai', wanted: false, expectedAmountCents: 1000, bank: null });
  });

  it('montre tout de suite un prélèvement dont la banque a vu le débit, même reporté ou pas encore échu', () => {
    const hint = (transactionId: string) => ({ kind: 'debit' as const, transactionId, amountCents: 1000, date: '2026-11-19', label: 'X' });
    const bank: BankContext = {
      coverage: null,
      suggestions: new Map([
        ['reporte', hint('t1')],
        ['aujourdhui', hint('t2')],
        ['essai', hint('t3')],
      ]),
      unexpected: [],
    };
    const reviews = chargesToReview(charges, [question], [postponed], today, bank);
    expect(reviews.map((r) => [r.chargeId, r.bank?.kind])).toEqual([
      ['passe', undefined],
      ['reporte', 'debit'],
      ['aujourdhui', 'debit'],
    ]);
  });

  it('suggère l’échec quand la fenêtre du prélèvement a été relue sans débit', () => {
    const bank: BankContext = { coverage: { from: '2026-11-01', through: '2026-11-22' }, suggestions: new Map(), unexpected: [] };
    const [review] = chargesToReview([charges[0]], [], [], '2026-11-22', bank);
    expect(review?.bank).toEqual({ kind: 'no_debit', through: '2026-11-22' });
  });
});

describe('upcomingCharges', () => {
  const transfer = { id: 't1', effectiveDate: '2026-11-23', chargeIds: ['b'] } as PlanTransfer;

  it('prend les trois prochains prélèvements voulus avec leur date de transfert', () => {
    const charges = [
      charge('passe', '2026-11-18', 'funded'),
      charge('a', '2026-11-20', 'funded'),
      charge('nonvoulu', '2026-11-21', 'unfunded'),
      charge('b', '2026-11-24', 'planned'),
      charge('c', '2026-11-25', 'planned'),
      charge('d', '2026-11-26', 'planned'),
    ];
    const upcoming = upcomingCharges(charges, [transfer], today);
    expect(upcoming.map((u) => u.chargeId)).toEqual(['a', 'b', 'c']);
    expect(upcoming[0]).toMatchObject({ funded: true, transferDate: null, amountCents: 1000, fundedAmountCents: 1030 });
    expect(upcoming[1]).toMatchObject({ funded: false, transferDate: '2026-11-23' });
  });
});
