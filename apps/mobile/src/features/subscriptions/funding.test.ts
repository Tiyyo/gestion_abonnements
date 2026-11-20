import { isProvisioned } from '@abonnements/core';
import { monthlyProvisionCents } from './funding';

describe('monthlyProvisionCents', () => {
  it('ne provisionne pas un abonnement mensuel', () => {
    expect(isProvisioned('month', 1)).toBe(false);
    expect(monthlyProvisionCents(1000, 'month', 1)).toBeNull();
  });

  it('répartit un abonnement annuel sur douze mois, arrondi au centime supérieur', () => {
    expect(monthlyProvisionCents(10001, 'year', 1)).toBe(834);
  });
});
