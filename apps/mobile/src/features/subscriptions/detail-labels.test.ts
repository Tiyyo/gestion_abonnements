import { formatEuros, suggestedPeriodEnd } from '@abonnements/core';
import { formatPercentBp } from '@/lib/format';
import { appliedMarginLabel, defaultStopDate, paymentMethodLabel, rhythmLabel, transferLabel, trialWhenLabel } from './detail-labels';

describe('rhythmLabel', () => {
  it.each([
    ['month', 1, 'mois'],
    ['month', 3, '3 mois'],
    ['week', 1, 'semaine'],
    ['year', 1, 'an'],
    ['year', 2, '2 ans'],
  ] as const)('%s × %i', (unit, count, label) => {
    expect(rhythmLabel(999, unit, count)).toBe(`${formatEuros(999)} / ${label}`);
  });
});

describe('trialWhenLabel', () => {
  it.each([
    [5, 'dans 5\u00a0jours'],
    [1, 'demain'],
    [0, 'aujourd’hui'],
    [-2, 'passée'],
  ])('%i jours', (days, label) => {
    expect(trialWhenLabel(days)).toBe(label);
  });
});

describe('transferLabel', () => {
  it('affiche « Aucun » sans transfert', () => {
    expect(transferLabel(null)).toBe('Aucun');
    expect(transferLabel({ transfer_date: null, funded_amount_cents: 100 })).toBe('Aucun');
  });

  it('affiche la date et le montant du transfert', () => {
    expect(transferLabel({ transfer_date: '2026-12-03', funded_amount_cents: 1030 })).toBe(`3\u00a0déc. · ${formatEuros(1030)}`);
  });
});

describe('appliedMarginLabel', () => {
  it('signale la marge globale', () => {
    expect(appliedMarginLabel(300, null)).toBe(`${formatPercentBp(300)} (globale)`);
    expect(appliedMarginLabel(250, 250)).toBe(formatPercentBp(250));
  });
});

describe('paymentMethodLabel', () => {
  it('distingue Revolut des autres moyens', () => {
    expect(paymentMethodLabel('revolut')).toBe('Revolut');
    expect(paymentMethodLabel('other')).toBe('Autre (non financé)');
  });
});

describe('defaultStopDate', () => {
  it('propose la fin de période suggérée si elle est à venir', () => {
    expect(defaultStopDate('2026-12-15', '2026-11-20')).toBe(suggestedPeriodEnd('2026-12-15'));
  });

  it('ne propose jamais une date passée', () => {
    expect(defaultStopDate('2026-11-20', '2026-11-20')).toBe('2026-11-20');
  });
});
