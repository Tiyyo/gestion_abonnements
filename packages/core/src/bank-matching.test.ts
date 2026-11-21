import { describe, expect, it } from 'vitest';
import {
  type BankDebit,
  labelMatchesName,
  looksFailed,
  type MatchingInput,
  type MatchOpenCharge,
  type MatchSubscription,
  matchBankDebits,
  mergeCoverage,
  nextSyncFrom,
} from './bank-matching';

const sub = (id: string, name: string, extra: Partial<MatchSubscription> = {}): MatchSubscription => ({
  id,
  name,
  aliases: [],
  status: 'active',
  ...extra,
});

const charge = (id: string, subscriptionId: string, dueDate: string, extra: Partial<MatchOpenCharge> = {}): MatchOpenCharge => ({
  id,
  subscriptionId,
  dueDate,
  status: 'funded',
  expectedAmountCents: 1349,
  isTrialConversion: false,
  ...extra,
});

const debit = (id: string, label: string, date: string, amountCents = 1349, remittance: string | null = null): BankDebit => ({
  id,
  label,
  date,
  amountCents,
  remittance,
});

const input = (patch: Partial<MatchingInput>): MatchingInput => ({
  debits: [],
  subscriptions: [sub('netflix', 'Netflix')],
  openCharges: [charge('c1', 'netflix', '2026-11-12')],
  paidCharges: [],
  recordedDebits: [],
  vaultReturns: [],
  ...patch,
});

describe('labelMatchesName', () => {
  it.each([
    ['NETFLIX.COM 866-579-7172', 'Netflix'],
    ['Google *YouTube Premium', 'YouTube Premium'],
    ['DISNEYPLUS', 'Disney+'],
    ['Canal Plus SA', 'Canal+'],
    ['SPOTIFY AB P2B3', 'Spotify'],
    ['Free Mobile', 'Free'],
    ['Crédit Agricole Assurances', 'credit agricole'],
  ])('reconnaît « %s » pour %s', (label, name) => {
    expect(labelMatchesName(label, name)).toBe(true);
  });

  it.each([
    ['APPLE.COM/BILL', 'Apple Music'],
    ['MAXICOFFEE', 'Max'],
    ['FREEMOBILE', 'Free'],
    ['Amazon Prime', 'Prime Video'],
    ['X CORP', 'X'],
    ['Netflix', ''],
  ])('ne reconnaît pas « %s » pour « %s »', (label, name) => {
    expect(labelMatchesName(label, name)).toBe(false);
  });
});

describe('matchBankDebits', () => {
  it('applique d’office un débit sans équivoque : même abonnement, financé, montant exact, à ±3 jours', () => {
    const result = matchBankDebits(input({ debits: [debit('t1', 'Netflix', '2026-11-14', 1349, 'NETFLIX.COM')] }));
    expect(result).toEqual([{ kind: 'apply', debit: expect.objectContaining({ id: 't1' }), chargeId: 'c1' }]);
  });

  it('reconnaît l’abonnement par le libellé du relevé ou par la marque du logo', () => {
    const byRemittance = matchBankDebits(input({ debits: [debit('t1', 'Paiement carte', '2026-11-12', 1349, 'NETFLIX.COM')] }));
    expect(byRemittance[0]).toMatchObject({ kind: 'apply', chargeId: 'c1' });

    const byAlias = matchBankDebits(
      input({ subscriptions: [sub('netflix', 'Séries du soir', { aliases: ['Netflix'] })], debits: [debit('t1', 'NETFLIX.COM', '2026-11-12')] }),
    );
    expect(byAlias[0]).toMatchObject({ kind: 'apply', chargeId: 'c1' });
  });

  it.each([
    ['montant différent, même couvert par la marge', { expectedAmountCents: 1299 }, 'amount_differs'],
    ['transfert pas encore fait', { status: 'planned' as const }, 'not_funded'],
    ['prélèvement non voulu', { status: 'unfunded' as const }, 'unwanted'],
  ])('propose sans appliquer : %s', (_label, patch, reason) => {
    const result = matchBankDebits(
      input({ openCharges: [charge('c1', 'netflix', '2026-11-12', patch)], debits: [debit('t1', 'Netflix', '2026-11-12')] }),
    );
    expect(result[0]).toMatchObject({ kind: 'suggest', chargeId: 'c1', reason });
  });

  it('propose sans appliquer la fin d’un essai : il reste à garder ou résilier', () => {
    const result = matchBankDebits(
      input({
        subscriptions: [sub('netflix', 'Netflix', { status: 'trial' })],
        openCharges: [charge('c1', 'netflix', '2026-11-12', { isTrialConversion: true })],
        debits: [debit('t1', 'Netflix', '2026-11-12')],
      }),
    );
    expect(result[0]).toMatchObject({ kind: 'suggest', reason: 'trial' });
  });

  it('propose le prélèvement le plus plausible quand plusieurs conviennent', () => {
    const twoCharges = matchBankDebits(
      input({
        openCharges: [charge('c1', 'netflix', '2026-11-10'), charge('c2', 'netflix', '2026-11-13')],
        debits: [debit('t1', 'Netflix', '2026-11-12')],
      }),
    );
    expect(twoCharges[0]).toMatchObject({ kind: 'suggest', chargeId: 'c2', reason: 'several_candidates' });

    const twoSubscriptions = matchBankDebits(
      input({
        subscriptions: [sub('icloud', 'iCloud+', { aliases: ['Apple'] }), sub('music', 'Apple Music', { aliases: ['Apple'] })],
        openCharges: [charge('c1', 'icloud', '2026-11-12', { expectedAmountCents: 299 }), charge('c2', 'music', '2026-11-12')],
        debits: [debit('t1', 'APPLE.COM/BILL', '2026-11-12', 1349)],
      }),
    );
    expect(twoSubscriptions[0]).toMatchObject({ kind: 'suggest', chargeId: 'c2', reason: 'several_candidates' });
  });

  it('ne rattache jamais deux débits au même prélèvement : le second est signalé', () => {
    const result = matchBankDebits(input({ debits: [debit('t2', 'Netflix', '2026-11-13'), debit('t1', 'Netflix', '2026-11-12')] }));
    expect(result.map((d) => [d.debit.id, d.kind])).toEqual([
      ['t1', 'apply'],
      ['t2', 'unmatched'],
    ]);
    expect(result[1]).toMatchObject({ subscriptionId: 'netflix' });
  });

  it('signale un débit hors fenêtre ou d’un marchand inconnu', () => {
    const result = matchBankDebits(input({ debits: [debit('t1', 'Netflix', '2026-11-16'), debit('t2', 'Salle de sport', '2026-11-12')] }));
    expect(result).toEqual([
      expect.objectContaining({ kind: 'unmatched', subscriptionId: null, debit: expect.objectContaining({ id: 't2' }) }),
      expect.objectContaining({ kind: 'unmatched', subscriptionId: 'netflix', debit: expect.objectContaining({ id: 't1' }) }),
    ]);
  });

  it('reconnaît un prélèvement déjà marqué passé à la main, une seule fois', () => {
    const result = matchBankDebits(
      input({
        openCharges: [],
        paidCharges: [{ id: 'c0', subscriptionId: 'netflix', actualAmountCents: 1349, actualDate: '2026-11-12' }],
        debits: [debit('t1', 'Netflix', '2026-11-13'), debit('t2', 'Netflix', '2026-11-13')],
      }),
    );
    expect(result.map((d) => d.kind)).toEqual(['already_paid', 'unmatched']);
  });

  it('reconnaît un débit inconnu déjà saisi et un retour de résidu vers le coffre', () => {
    const result = matchBankDebits(
      input({
        recordedDebits: [{ id: 'e1', amountCents: 4500, date: '2026-11-10' }],
        vaultReturns: [{ id: 'tr1', amountCents: 51, date: '2026-11-30' }],
        debits: [debit('t1', 'Salle de sport', '2026-11-11', 4500), debit('t2', 'To EUR Coffre', '2026-11-30', 51)],
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ kind: 'already_recorded', recordId: 'e1' }),
      expect.objectContaining({ kind: 'internal', transferId: 'tr1' }),
    ]);
  });

  it('ne prend pas pour un retour de résidu un débit qui porte le nom d’un abonnement', () => {
    const result = matchBankDebits(
      input({ openCharges: [], vaultReturns: [{ id: 'tr1', amountCents: 1349, date: '2026-11-12' }], debits: [debit('t1', 'Netflix', '2026-11-12')] }),
    );
    expect(result[0]).toMatchObject({ kind: 'unmatched', subscriptionId: 'netflix' });
  });
});

describe('couverture de la lecture', () => {
  it('relit 7 jours la première fois, puis 5 jours avant la dernière lecture', () => {
    expect(nextSyncFrom(null, '2026-11-20')).toBe('2026-11-13');
    expect(nextSyncFrom({ from: '2026-11-01', through: '2026-11-18' }, '2026-11-20')).toBe('2026-11-13');
  });

  it('prolonge la couverture, sauf lecture incomplète ou trou', () => {
    const previous = { from: '2026-11-01', through: '2026-11-18' };
    expect(mergeCoverage(null, '2026-11-13', true, '2026-11-20')).toEqual({ from: '2026-11-13', through: '2026-11-20' });
    expect(mergeCoverage(previous, '2026-11-13', true, '2026-11-20')).toEqual({ from: '2026-11-01', through: '2026-11-20' });
    expect(mergeCoverage(previous, '2026-11-13', false, '2026-11-20')).toEqual(previous);
    expect(mergeCoverage(previous, '2026-11-25', true, '2026-12-01')).toEqual({ from: '2026-11-25', through: '2026-12-01' });
  });
});

describe('looksFailed', () => {
  const coverage = { from: '2026-11-05', through: '2026-11-20' };

  it('suggère l’échec quand toute la fenêtre a été relue sans aucun débit', () => {
    expect(looksFailed('2026-11-12', coverage, [])).toBe(true);
  });

  it('ne suggère rien tant que la fenêtre n’est pas entièrement relue', () => {
    expect(looksFailed('2026-11-12', null, [])).toBe(false);
    expect(looksFailed('2026-11-17', coverage, [])).toBe(false);
    expect(looksFailed('2026-11-07', coverage, [])).toBe(false);
  });

  it('ne suggère rien si un débit non reconnu tombe dans la fenêtre', () => {
    expect(looksFailed('2026-11-12', coverage, ['2026-11-14'])).toBe(false);
    expect(looksFailed('2026-11-12', coverage, ['2026-11-16'])).toBe(true);
  });
});
