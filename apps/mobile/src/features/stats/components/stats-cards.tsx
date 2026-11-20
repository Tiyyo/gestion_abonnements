import type { Stats } from '@/db/repositories/stats';
import type { MonthlyTrend } from '@/db/repositories/stats-trend';
import { periodFigures } from '@/features/stats/stats-derivations';
import { buildInsights, isInsightsEmpty } from '@/features/stats/trend-insights';
import type { StatsPeriod } from '@/features/stats/types';
import { CategoryCard } from './category-card';
import { InsightsCard } from './insights-card';
import { StatsDetailsCard } from './stats-details-card';
import { TrendCard } from './trend-card';

/** Cartes sous l'en-tête : tendance, répartition, enseignements, détails de la période. */
export function StatsCards({ stats, trend, period }: { stats: Stats; trend: MonthlyTrend; period: StatsPeriod }) {
  const figures = periodFigures(stats, period);
  const insights = buildInsights(stats, trend);
  return (
    <>
      <TrendCard months={trend.months} />
      <CategoryCard rows={figures.rows} totalCents={figures.totalCents ?? 0} />
      {isInsightsEmpty(insights) ? null : <InsightsCard insights={insights} />}
      <StatsDetailsCard stats={stats} period={period} />
    </>
  );
}
