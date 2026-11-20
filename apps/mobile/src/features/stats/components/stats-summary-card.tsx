import { formatEuros } from '@abonnements/core';
import { XStack } from 'tamagui';
import type { Stats } from '@/db/repositories/stats';
import { periodFigures, subscriptionCount } from '@/features/stats/stats-derivations';
import type { StatsPeriod } from '@/features/stats/types';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { GlassPanel } from '@/ui/surfaces/glass-panel';
import { HeroAmount } from '@/ui/text/hero-amount';
import { Amount, Caption } from '@/ui/text/typography';

export function StatsSummaryCard({ stats, period }: { stats: Stats | undefined; period: StatsPeriod }) {
  const figures = periodFigures(stats, period);
  return (
    <GlassCard>
      <Caption color="onGlassMuted">{figures.caption}</Caption>
      <HeroAmount cents={figures.totalCents} />
      <XStack gap="2">
        <GlassPanel>
          <Caption color="onGlassMuted">{figures.otherLabel}</Caption>
          <Amount fontSize={17} fontWeight="700" color="onGlass">
            {figures.otherCents === null ? '—' : formatEuros(figures.otherCents)}
          </Amount>
        </GlassPanel>
        <GlassPanel>
          <Caption color="onGlassMuted">Exclus du total</Caption>
          <Amount fontSize={17} fontWeight="700" color="onGlass">
            {stats ? subscriptionCount(stats.excludedCount) : '—'}
          </Amount>
        </GlassPanel>
      </XStack>
    </GlassCard>
  );
}
