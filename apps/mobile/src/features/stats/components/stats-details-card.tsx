import { formatEuros } from '@abonnements/core';
import type { Stats } from '@/db/repositories/stats';
import { priceIncreasesLabel } from '@/features/stats/stats-derivations';
import type { StatsPeriod } from '@/features/stats/types';
import { Card } from '@/ui/surfaces/card';
import { KeyValue } from '@/ui/surfaces/key-value';

export function StatsDetailsCard({ stats, period }: { stats: Stats; period: StatsPeriod }) {
  return (
    <Card py="0" gap="0">
      {period === 'month' ? (
        <>
          <KeyValue label="Abonnements mensuels" value={formatEuros(stats.monthlySubscriptionsCents)} />
          <KeyValue label="Annuels et longs, ramenés au mois" value={formatEuros(stats.longSubscriptionsPerMonthCents)} />
        </>
      ) : (
        <KeyValue label="Dépensé sur 12 mois" value={formatEuros(stats.spentLast12MonthsCents)} />
      )}
      <KeyValue label="Hausses sur 12 mois" value={priceIncreasesLabel(stats.priceIncreases)} last />
    </Card>
  );
}
