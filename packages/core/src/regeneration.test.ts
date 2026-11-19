import { planRegeneration, type StoredCharge } from './regeneration';
import type { ExpectedCharge } from './types';

const expected = (dueDate: string, overrides: Partial<ExpectedCharge> = {}): ExpectedCharge => ({
  subscriptionId: 'spotify',
  dueDate,
  expectedAmountCents: 1199,
  fundedAmountCents: 1235,
  status: 'planned',
  isTrialConversion: false,
  ...overrides,
});

const stored = (id: string, dueDate: string, overrides: Partial<StoredCharge> = {}): StoredCharge => ({
  id,
  subscriptionId: 'spotify',
  dueDate,
  provisionOnly: false,
  status: 'planned',
  expectedAmountCents: 1199,
  fundedAmountCents: 1235,
  isTrialConversion: false,
  ...overrides,
});

describe('planRegeneration', () => {
  it('crée les charges manquantes et ne touche pas aux charges identiques', () => {
    const plan = planRegeneration('spotify', [stored('a', '2026-11-21')], [expected('2026-11-21'), expected('2026-12-21')]);
    expect(plan.create.map((c) => c.dueDate)).toEqual(['2026-12-21']);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it('met à jour sur place en gardant l’identifiant après une hausse de prix', () => {
    const plan = planRegeneration(
      'spotify',
      [stored('a', '2026-12-21')],
      [expected('2026-12-21', { expectedAmountCents: 1299, fundedAmountCents: 1338 })],
    );
    expect(plan.update).toEqual([
      { id: 'a', expectedAmountCents: 1299, fundedAmountCents: 1338, status: 'planned', isTrialConversion: false },
    ]);
  });

  it('passe en non financé sur place quand l’abonnement est à résilier', () => {
    const plan = planRegeneration('spotify', [stored('a', '2027-01-21')], [expected('2027-01-21', { status: 'unfunded', fundedAmountCents: 0 })]);
    expect(plan.update[0]).toMatchObject({ id: 'a', status: 'unfunded', fundedAmountCents: 0 });
  });

  it('supprime une charge prévue qui n’est plus attendue', () => {
    expect(planRegeneration('spotify', [stored('a', '2026-11-21'), stored('b', '2026-12-21')], [expected('2026-11-21')]).remove).toEqual(['b']);
  });

  it('ignore une charge déjà financée qui n’est plus attendue, sans la supprimer', () => {
    const plan = planRegeneration('spotify', [stored('a', '2026-11-21', { status: 'funded' })], []);
    expect(plan.skip).toEqual(['a']);
    expect(plan.remove).toEqual([]);
  });

  it('ne modifie jamais une charge financée, payée, échouée ou ignorée', () => {
    const plan = planRegeneration(
      'spotify',
      [
        stored('f', '2026-11-21', { status: 'funded' }),
        stored('p', '2026-10-21', { status: 'paid' }),
        stored('x', '2026-09-21', { status: 'failed' }),
        stored('s', '2026-08-21', { status: 'skipped' }),
      ],
      [expected('2026-11-21', { expectedAmountCents: 1299, fundedAmountCents: 1338 })],
    );
    expect(plan).toEqual({ create: [], update: [], remove: [], skip: [] });
  });

  it('laisse de côté les provisions et les autres abonnements', () => {
    const plan = planRegeneration(
      'spotify',
      [stored('prov', '2026-11-02', { provisionOnly: true }), stored('other', '2026-11-21', { subscriptionId: 'netflix' })],
      [],
    );
    expect(plan.remove).toEqual([]);
  });
});
