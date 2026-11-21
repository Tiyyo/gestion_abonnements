import { classifyUnknownDebit, markFailed, markPaid, needsReview, normalizeName, type ReconcilableCharge } from './reconciliation';

const charge = (overrides: Partial<ReconcilableCharge> = {}): ReconcilableCharge => ({
  id: 'c1',
  subscriptionId: 'spotify',
  dueDate: '2026-11-21',
  status: 'funded',
  expectedAmountCents: 1199,
  fundedAmountCents: 1235,
  ...overrides,
});

describe('needsReview', () => {
  it('liste une charge ouverte dont la date est passée', () => {
    expect(needsReview({ ...charge(), provisionOnly: false }, '2026-11-22')).toBe(true);
    expect(needsReview({ ...charge(), provisionOnly: false }, '2026-11-21')).toBe(false);
    expect(needsReview({ ...charge({ status: 'paid' }), provisionOnly: false }, '2026-11-22')).toBe(false);
    expect(needsReview({ ...charge(), provisionOnly: true }, '2026-11-22')).toBe(false);
  });
});

describe('markPaid', () => {
  it('ne crée aucun événement quand le montant est celui attendu', () => {
    expect(markPaid(charge(), 1199, '2026-11-21')).toEqual({
      status: 'paid',
      actualAmountCents: 1199,
      actualDate: '2026-11-21',
      events: [],
      proposeAmountUpdate: false,
    });
  });

  it('signale une hausse de prix et propose la mise à jour', () => {
    const outcome = markPaid(charge(), 1299, '2026-11-21');
    expect(outcome.proposeAmountUpdate).toBe(true);
    expect(outcome.events).toEqual([
      expect.objectContaining({ type: 'price_change', payload: { chargeId: 'c1', from: 1199, to: 1299, source: 'reconciliation', applied: false } }),
    ]);
  });

  it('rattache le prélèvement inattendu d’un essai à sa charge', () => {
    const outcome = markPaid(charge({ status: 'unfunded', fundedAmountCents: 0, expectedAmountCents: 999 }), 999, '2026-11-20');
    expect(outcome.events).toEqual([expect.objectContaining({ type: 'unexpected_charge', amountCents: 999, payload: { chargeId: 'c1' } })]);
  });

  it('refuse de rapprocher deux fois', () => {
    expect(() => markPaid(charge({ status: 'paid' }), 1199, '2026-11-21')).toThrow();
  });
});

describe('markFailed', () => {
  it('laisse prévue une charge dont le transfert n’est pas fait', () => {
    expect(markFailed(charge({ status: 'planned' }), { kind: 'merchant_will_retry' }, '2026-11-22').status).toBe('planned');
  });

  it('garde la charge financée et la revérifie trois jours plus tard si le marchand retente', () => {
    expect(markFailed(charge(), { kind: 'merchant_will_retry' }, '2026-11-22')).toEqual({
      status: 'funded',
      reviewAgainOn: '2026-11-25',
      correctiveTransferCents: 0,
      events: [],
    });
  });

  it('propose un transfert correctif seulement pour une hausse de prix', () => {
    expect(markFailed(charge(), { kind: 'merchant_will_retry' }, '2026-11-22', 1299).correctiveTransferCents).toBe(64);
    expect(markFailed(charge(), { kind: 'merchant_will_retry' }, '2026-11-22', 1199).correctiveTransferCents).toBe(0);
  });

  it('abandonne avec un événement charge_failed', () => {
    const outcome = markFailed(charge(), { kind: 'give_up' }, '2026-11-22');
    expect(outcome.status).toBe('failed');
    expect(outcome.events.map((e) => e.type)).toEqual(['charge_failed']);
  });
});

describe('classifyUnknownDebit', () => {
  const subscriptions = [
    { id: 'spotify', name: 'Spotify', status: 'active' as const, periodUnit: 'month' as const, periodCount: 1 },
    { id: 'vpn', name: 'Ancien VPN', status: 'cancelled' as const, periodUnit: 'month' as const, periodCount: 1 },
  ];
  const charges = [
    { ...charge({ id: 'open', dueDate: '2026-12-21' }), actualDate: null },
    { ...charge({ id: 'paid', status: 'paid', dueDate: '2026-11-21' }), actualDate: '2026-11-21' },
  ];

  it('retrouve le prélèvement prévu à ±3 jours', () => {
    expect(classifyUnknownDebit({ name: ' spotify ', amountCents: 1199, date: '2026-12-23' }, subscriptions, charges)).toEqual({
      kind: 'matches_charge',
      chargeId: 'open',
    });
  });

  it('détecte un doublon à moins d’une demi-période du dernier paiement', () => {
    const result = classifyUnknownDebit({ name: 'Spotify', amountCents: 1199, date: '2026-11-25' }, subscriptions, charges);
    expect(result).toMatchObject({ kind: 'event', event: { type: 'duplicate', subscriptionId: 'spotify', amountCents: 1199 } });
  });

  it('détecte un prélèvement après résiliation', () => {
    const result = classifyUnknownDebit({ name: 'Ancien VPN', amountCents: 499, date: '2026-12-01' }, subscriptions, charges);
    expect(result).toMatchObject({ kind: 'event', event: { type: 'post_cancel_charge' } });
  });

  it('classe un débit inconnu en inattendu et propose de créer l’abonnement', () => {
    const result = classifyUnknownDebit({ name: 'Canal+', amountCents: 2599, date: '2026-12-01' }, subscriptions, charges);
    expect(result).toMatchObject({ kind: 'event', event: { type: 'unexpected_charge', subscriptionId: null }, offerCreateSubscription: true });
  });
});

describe('normalizeName', () => {
  it('ignore casse, accents et espaces', () => {
    expect(normalizeName('  Le  Monde Économie ')).toBe('le monde economie');
  });
});
