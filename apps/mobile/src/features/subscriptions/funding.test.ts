import { isProvisioned } from '@abonnements/core';
import { monthlyEquivalentCents, monthlyProvisionCents } from './funding';

describe('monthlyProvisionCents', () => {
  it('ne provisionne pas un abonnement mensuel', () => {
    expect(isProvisioned('month', 1)).toBe(false);
    expect(monthlyProvisionCents(1000, 'month', 1)).toBeNull();
  });

  it('répartit un abonnement annuel sur douze mois, arrondi au centime supérieur', () => {
    expect(monthlyProvisionCents(10001, 'year', 1)).toBe(834);
  });
});

describe('monthlyEquivalentCents', () => {
  it.each([
    ['month', 1, 1299, 1299],
    ['month', 3, 3000, 1000],
    ['year', 1, 12000, 1000],
    ['year', 2, 12000, 500],
    ['year', 1, 10001, 833],
    ['week', 1, 300, 1300],
    ['week', 2, 300, 650],
  ] as const)('%s × %i à %i centimes vaut %i centimes par mois', (unit, count, amount, expected) => {
    expect(monthlyEquivalentCents(amount, unit, count)).toBe(expected);
  });
});
