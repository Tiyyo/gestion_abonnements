import { everyLabel, heroAmountCaption, heroFacts, noticeKind } from './detail-hero';

const base = {
  status: 'active',
  trial_end_date: null,
  period_end_date: null,
  cancel_done: 0,
  next_charge_date: '2026-12-05',
  period_unit: 'month',
  period_count: 1,
} as const;

describe('everyLabel', () => {
  it.each([
    ['week', 1, 'par semaine'],
    ['week', 2, 'toutes les 2 semaines'],
    ['month', 1, 'par mois'],
    ['month', 3, 'tous les 3 mois'],
    ['year', 1, 'par an'],
    ['year', 2, 'tous les 2 ans'],
  ] as const)('%s × %i', (unit, count, label) => {
    expect(everyLabel(unit, count)).toBe(label);
  });
});

describe('noticeKind', () => {
  it('signale un essai daté et un abonnement à résilier daté', () => {
    expect(noticeKind({ ...base, status: 'trial', trial_end_date: '2026-12-01' })).toBe('trial');
    expect(noticeKind({ ...base, status: 'to_cancel', period_end_date: '2026-12-04' })).toBe('to_cancel');
  });

  it('ne signale rien sans date, ni pour un abonnement actif ou résilié', () => {
    expect(noticeKind({ ...base, status: 'trial' })).toBeNull();
    expect(noticeKind(base)).toBeNull();
    expect(noticeKind({ ...base, status: 'cancelled' })).toBeNull();
  });
});

describe('heroAmountCaption', () => {
  it('donne le rythme, et précise « après l’essai » pendant un essai', () => {
    expect(heroAmountCaption(base)).toBe('par mois');
    expect(heroAmountCaption({ ...base, status: 'trial', trial_end_date: '2026-12-01' })).toBe('par mois, après l’essai');
  });
});

const TODAY = '2026-11-21';

describe('heroFacts', () => {
  const charge = { transfer_date: '2026-12-04', funded_amount_cents: 1029 };

  it('actif : prochain prélèvement et transfert prévu', () => {
    const facts = heroFacts(base, charge, TODAY);
    expect(facts.map((f) => f.label)).toEqual(['Prochain prélèvement', 'Transfert prévu']);
    expect(facts[0]?.value).toBe('sam.\u00a05\u00a0déc.');
    expect(facts[1]?.value).toContain('4\u00a0déc.');
  });

  it('actif sans transfert : « Aucun »', () => {
    expect(heroFacts(base, null, TODAY)[1]?.value).toBe('Aucun');
  });

  it('essai : seulement la fin d’essai', () => {
    expect(heroFacts({ ...base, status: 'trial', trial_end_date: '2026-12-01' }, null, TODAY)).toEqual([
      { label: 'Fin d’essai', value: 'mar.\u00a01er\u00a0déc.' },
    ]);
  });

  it('à résilier : fin de période et état de la résiliation', () => {
    const row = { ...base, status: 'to_cancel', period_end_date: '2026-12-04' } as const;
    expect(heroFacts(row, null, TODAY)[1]).toEqual({ label: 'Résiliation chez le marchand', value: 'À faire' });
    expect(heroFacts({ ...row, cancel_done: 1 }, null, TODAY)[1]?.value).toBe('Faite');
  });

  it('résilié : aucune échéance', () => {
    expect(heroFacts({ ...base, status: 'cancelled' }, charge, TODAY)).toEqual([]);
  });
});
