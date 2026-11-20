import { formatEuros } from '@abonnements/core';
import type { Stats } from '@/db/repositories/stats';
import {
  barWidth,
  categoryAccessibilityLabel,
  categoryAmountLabel,
  categoryShare,
  periodFigures,
  subscriptionCount,
} from './stats-derivations';

const stats: Stats = {
  monthlyCents: 3000,
  annualCents: 36000,
  monthlyByCategory: [{ category: 'Vidéo', cents: 3000 }],
  annualByCategory: [{ category: 'Vidéo', cents: 36000 }],
  monthlySubscriptionsCents: 2000,
  longSubscriptionsPerMonthCents: 1000,
  excludedCount: 1,
  spentLast12MonthsCents: 30000,
  topSubscription: { name: 'Netflix', annualCents: 24000 },
  priceIncreases: { count: 0, annualImpactCents: 0 },
};

describe('statistiques', () => {
  it('accorde le nombre d’abonnements', () => {
    expect(subscriptionCount(0)).toBe('0 abonnement');
    expect(subscriptionCount(1)).toBe('1 abonnement');
    expect(subscriptionCount(2)).toBe('2 abonnements');
  });

  it('calcule la part d’une catégorie, sans diviser par zéro', () => {
    expect(categoryShare(1000, 3000)).toBe(33);
    expect(categoryShare(2000, 3000)).toBe(67);
    expect(categoryShare(500, 0)).toBe(0);
  });

  it('garde une barre visible pour les petites parts', () => {
    expect(barWidth(0)).toBe('2%');
    expect(barWidth(40)).toBe('40%');
  });

  it('écrit le montant et la part d’une catégorie', () => {
    const row = { category: 'Vidéo', cents: 1000 };
    expect(categoryAmountLabel(row, 33)).toBe(`${formatEuros(1000)} · 33 %`);
    expect(categoryAccessibilityLabel(row, 33)).toBe(`Vidéo : ${formatEuros(1000)}, 33 %`);
  });

  it('choisit les chiffres de la période', () => {
    expect(periodFigures(stats, 'month')).toMatchObject({ totalCents: 3000, otherCents: 36000, otherLabel: 'Par an' });
    expect(periodFigures(stats, 'year')).toMatchObject({ totalCents: 36000, otherCents: 3000, otherLabel: 'Par mois' });
    expect(periodFigures(stats, 'year').rows).toBe(stats.annualByCategory);
    expect(periodFigures(undefined, 'month')).toMatchObject({ totalCents: null, otherCents: null, rows: [] });
  });
});
