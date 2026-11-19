import { type BalanceCharge, type BalanceTransfer, estimatedBalance, forgottenTrialRisk, type Ledger, residualToReturn } from './balance';

function charge(overrides: Partial<BalanceCharge>): BalanceCharge {
  return {
    status: 'planned',
    dueDate: '2026-11-19',
    fundedAmountCents: 0,
    expectedAmountCents: 0,
    actualAmountCents: null,
    actualDate: null,
    provisionOnly: false,
    ...overrides,
  };
}

function transfer(overrides: Partial<BalanceTransfer>): BalanceTransfer {
  return {
    type: 'vault_to_main',
    status: 'planned',
    plannedDate: '2026-11-18',
    rescheduledDate: null,
    doneOn: null,
    amountCents: 0,
    ...overrides,
  };
}

const disney = charge({ status: 'unfunded', dueDate: '2026-11-20', expectedAmountCents: 999 });

function novemberLedger(): Ledger {
  return {
    transfers: [
      transfer({ plannedDate: '2026-11-18', amountCents: 308 }),
      transfer({ plannedDate: '2026-11-20', amountCents: 1235 }),
      transfer({ plannedDate: '2026-11-23', amountCents: 1390 }),
    ],
    charges: [
      charge({ dueDate: '2026-11-19', fundedAmountCents: 308, expectedAmountCents: 299 }),
      charge({ dueDate: '2026-11-21', fundedAmountCents: 1235, expectedAmountCents: 1199 }),
      charge({ dueDate: '2026-11-24', fundedAmountCents: 1390, expectedAmountCents: 1349 }),
      disney,
    ],
    events: [],
  };
}

describe('alerte essai oublié (9.3)', () => {
  it('alerte quand le transfert de Spotify tombe le jour du prélèvement Disney+', () => {
    expect(forgottenTrialRisk(novemberLedger(), '2026-11-17', disney)).toBe(true);
  });

  it("n'alerte pas quand aucun argent ne transite le jour du prélèvement", () => {
    const ledger = novemberLedger();
    const calm: Ledger = { ...ledger, transfers: ledger.transfers.filter((t) => t.plannedDate !== '2026-11-20') };
    expect(forgottenTrialRisk(calm, '2026-11-17', disney)).toBe(false);
  });

  it('tient compte d’un transfert reporté après le prélèvement', () => {
    const ledger = novemberLedger();
    const rescheduled: Ledger = {
      ...ledger,
      transfers: ledger.transfers.map((t) => (t.plannedDate === '2026-11-20' ? { ...t, rescheduledDate: '2026-11-21' } : t)),
    };
    expect(forgottenTrialRisk(rescheduled, '2026-11-17', disney)).toBe(false);
  });

  it('ignore un prélèvement non financé déjà passé', () => {
    expect(forgottenTrialRisk(novemberLedger(), '2026-11-21', disney)).toBe(false);
  });
});

describe('solde estimé et résidu (9.2)', () => {
  const paidNovember: Ledger = {
    transfers: [
      transfer({ status: 'done', doneOn: '2026-11-18', amountCents: 308 }),
      transfer({ status: 'done', doneOn: '2026-11-20', amountCents: 1235 }),
      transfer({ status: 'done', doneOn: '2026-11-23', amountCents: 1390 }),
    ],
    charges: [
      charge({ status: 'paid', dueDate: '2026-11-19', fundedAmountCents: 308, actualAmountCents: 299, actualDate: '2026-11-19' }),
      charge({ status: 'paid', dueDate: '2026-11-21', fundedAmountCents: 1235, actualAmountCents: 1199, actualDate: '2026-11-21' }),
      charge({ status: 'paid', dueDate: '2026-11-24', fundedAmountCents: 1390, actualAmountCents: 1349, actualDate: '2026-11-24' }),
    ],
    events: [],
  };

  it('donne le résidu de 0,86 € des maquettes au 30 novembre', () => {
    expect(estimatedBalance(paidNovember, '2026-11-30')).toBe(86);
    expect(residualToReturn(paidNovember, '2026-11-30')).toBe(86);
  });

  it('garde sur le compte l’argent transféré pour un prélèvement à venir', () => {
    const withDecember: Ledger = {
      ...paidNovember,
      transfers: [...paidNovember.transfers, transfer({ status: 'done', doneOn: '2026-11-30', amountCents: 500 })],
      charges: [...paidNovember.charges, charge({ status: 'funded', dueDate: '2026-12-01', fundedAmountCents: 500 })],
    };
    expect(estimatedBalance(withDecember, '2026-11-30')).toBe(586);
    expect(residualToReturn(withDecember, '2026-11-30')).toBe(86);
  });

  it('laisse l’argent d’un prélèvement échoué dans le solde', () => {
    const failed: Ledger = {
      ...paidNovember,
      charges: paidNovember.charges.map((c) => (c.dueDate === '2026-11-24' ? { ...c, status: 'failed', actualAmountCents: null, actualDate: null } : c)),
    };
    expect(estimatedBalance(failed, '2026-11-30')).toBe(86 + 1349);
  });

  it('déduit un renvoi de résidu et un prélèvement inconnu, sans compter deux fois un essai passé', () => {
    const ledger: Ledger = {
      transfers: [...paidNovember.transfers, transfer({ type: 'residual_return', status: 'done', doneOn: '2026-11-30', amountCents: 50 })],
      charges: [
        ...paidNovember.charges,
        charge({ status: 'paid', dueDate: '2026-11-20', actualAmountCents: 999, actualDate: '2026-11-20', expectedAmountCents: 999 }),
      ],
      events: [
        { type: 'unexpected_charge', occurredOn: '2026-11-20', amountCents: 999, linkedToCharge: true },
        { type: 'unexpected_charge', occurredOn: '2026-11-25', amountCents: 20, linkedToCharge: false },
      ],
    };
    expect(estimatedBalance(ledger, '2026-11-30')).toBe(86 - 999 - 50 - 20);
    expect(residualToReturn(ledger, '2026-11-30')).toBe(0);
  });
});
