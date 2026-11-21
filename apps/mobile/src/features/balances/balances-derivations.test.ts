import { daysUntil, freshness, refreshAccessibilityLabel, vaultShortfallCents } from './balances-derivations';

describe('calculs', () => {
  it('compte les jours restants avant la fin de l’accord', () => {
    expect(daysUntil('2027-05-17T14:30:41Z', new Date('2027-05-03T10:00:00Z'))).toBe(14);
  });

  it('calcule ce qui manque au coffre pour les transferts à venir', () => {
    expect(vaultShortfallCents(8627, 819)).toBe(0);
    expect(vaultShortfallCents(500, 819)).toBe(319);
  });
});

describe('freshness', () => {
  const now = new Date(2026, 10, 19, 15, 0);

  it('dit « à l’instant » pendant la première minute', () => {
    expect(freshness(new Date(2026, 10, 19, 14, 59, 30).toISOString(), now)).toBe('à l’instant');
  });

  it('donne l’heure le jour même', () => {
    expect(freshness(new Date(2026, 10, 19, 14, 40).toISOString(), now)).toMatch(/^à \d{2}:\d{2}$/);
  });

  it('donne le jour et l’heure les jours précédents', () => {
    expect(freshness(new Date(2026, 10, 18, 12, 0).toISOString(), now)).toMatch(/^le .+ à \d{2}:\d{2}$/);
  });
});

describe('refreshAccessibilityLabel', () => {
  it('nomme l’action, puis la fraîcheur', () => {
    expect(refreshAccessibilityLabel(false, 'à 14:02')).toBe('Actualiser les soldes, mis à jour à 14:02');
    expect(refreshAccessibilityLabel(false, null)).toBe('Actualiser les soldes');
    expect(refreshAccessibilityLabel(true, 'à 14:02')).toBe('Actualisation des soldes en cours');
  });
});
