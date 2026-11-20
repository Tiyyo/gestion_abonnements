import { formatEuros } from '@abonnements/core';
import type { Stats } from '@/db/repositories/stats';
import type { MonthlyTrend, TrendMonth } from '@/db/repositories/stats-trend';
import { isTrendEmpty, monthLabel, monthShortLabel, trendColumnLabel, trendSelection, trendSummaryLabel } from './trend-format';
import { averagePaidCents, buildInsights, isInsightsEmpty, monthChange } from './trend-insights';

const month = (m: string, paidCents = 0, plannedCents = 0): TrendMonth => ({ month: m, paidCents, plannedCents });

/** Douze mois de décembre 2025 à novembre 2026, vides sauf ceux fournis. */
function year(values: Record<string, [number, number?]> = {}): TrendMonth[] {
  const keys = ['2025-12', ...Array.from({ length: 11 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)];
  return keys.map((k) => month(k, values[k]?.[0] ?? 0, values[k]?.[1] ?? 0));
}

const stats: Stats = {
  monthlyCents: 3264,
  annualCents: 39164,
  monthlyByCategory: [],
  annualByCategory: [],
  monthlySubscriptionsCents: 2847,
  longSubscriptionsPerMonthCents: 417,
  excludedCount: 0,
  spentLast12MonthsCents: 0,
  topSubscription: { name: 'Netflix', annualCents: 16188 },
};

describe('libellés de la tendance', () => {
  it('nomme les mois en français', () => {
    expect(monthLabel('2026-11')).toBe('novembre 2026');
    expect(monthShortLabel('2026-02')).toBe('févr.');
    expect(monthShortLabel('2026-08')).toBe('août');
  });

  it('écrit le libellé accessible d’une colonne', () => {
    expect(trendColumnLabel(month('2026-11', 2198))).toBe(`novembre 2026 : ${formatEuros(2198)}`);
    expect(trendColumnLabel(month('2026-11', 299, 1899))).toBe(`novembre 2026 : ${formatEuros(2198)}, dont ${formatEuros(1899)} à venir`);
    expect(trendColumnLabel(month('2026-11', 0, 1899))).toBe(`novembre 2026 : ${formatEuros(1899)}, à venir`);
  });

  it('prépare la légende du mois choisi', () => {
    expect(trendSelection(month('2026-10', 3000))).toEqual({ title: 'octobre 2026', amount: formatEuros(3000), detail: null });
    expect(trendSelection(month('2026-11', 299, 1899)).detail).toBe(`dont ${formatEuros(1899)} à venir`);
  });

  it('résume le minimum, le maximum et le mois en cours', () => {
    const label = trendSummaryLabel(year({ '2026-09': [1500], '2026-10': [4000], '2026-11': [299, 1899] }));
    expect(label).toContain('sur 12 mois');
    expect(label).toContain(`Minimum : ${formatEuros(0)} en décembre 2025`);
    expect(label).toContain(`Maximum : ${formatEuros(4000)} en octobre 2026`);
    expect(label).toContain(`Mois en cours, novembre 2026 : ${formatEuros(2198)}`);
    expect(trendSummaryLabel([])).toBe('Dépenses par mois : aucune donnée.');
  });

  it('reconnaît une tendance vide', () => {
    expect(isTrendEmpty(year())).toBe(true);
    expect(isTrendEmpty(year({ '2026-11': [0, 500] }))).toBe(false);
  });
});

describe('enseignements', () => {
  it('fait la moyenne du premier paiement au dernier mois terminé', () => {
    expect(averagePaidCents(year({ '2026-08': [3000], '2026-10': [1500], '2026-11': [9999] }))).toEqual({ cents: 1500, monthCount: 3 });
    expect(averagePaidCents(year({ '2026-11': [299] }))).toEqual({ cents: 299, monthCount: 1 });
    expect(averagePaidCents(year())).toBeNull();
    expect(averagePaidCents([])).toBeNull();
  });

  it('compare le mois en cours (payé et prévu) au précédent', () => {
    expect(monthChange(year({ '2026-10': [2000], '2026-11': [299, 2101] }))).toEqual({
      direction: 'up',
      deltaCents: 400,
      text: `Ce mois-ci : ${formatEuros(400)} de plus qu’en octobre`,
    });
    expect(monthChange(year({ '2026-10': [2000], '2026-11': [1000] }))).toMatchObject({
      direction: 'down',
      text: `Ce mois-ci : ${formatEuros(1000)} de moins qu’en octobre`,
    });
    expect(monthChange(year({ '2026-10': [2000], '2026-11': [500, 1500] }))).toMatchObject({
      direction: 'flat',
      text: 'Ce mois-ci : autant qu’en octobre',
    });
    expect(monthChange(year())).toBeNull();
    expect(monthChange([month('2026-11', 100)])).toBeNull();
  });

  it('assemble la carte', () => {
    const trend: MonthlyTrend = { months: year({ '2026-10': [2000], '2026-11': [299, 2101] }), nextMonth: month('2026-12', 0, 3346) };
    const insights = buildInsights(stats, trend);
    expect(insights).toMatchObject({
      yearly: `Ça te coûte ${formatEuros(39164)} par an`,
      average: { value: formatEuros(2000), label: 'Moyenne payée par mois' },
      top: { name: 'Netflix', value: `${formatEuros(16188)} par an` },
      next: { label: 'Prévu en décembre', value: formatEuros(3346) },
    });
    expect(insights.change?.direction).toBe('up');
    expect(isInsightsEmpty(insights)).toBe(false);
  });

  it('reste vide sans abonnement ni historique', () => {
    const empty = buildInsights({ ...stats, annualCents: 0, topSubscription: null }, { months: year(), nextMonth: month('2026-12') });
    expect(empty).toEqual({ yearly: null, average: null, change: null, top: null, next: null });
    expect(isInsightsEmpty(empty)).toBe(true);
  });
});
