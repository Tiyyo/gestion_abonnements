import { formatEuros } from '@abonnements/core';
import { XStack } from 'tamagui';
import type { Stats } from '@/db/repositories/stats';
import { periodFigures, subscriptionCount } from '@/features/stats/stats-derivations';
import type { StatsPeriod } from '@/features/stats/types';
import { BUSY_A11Y } from '@/ui/feedback/busy-a11y';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { useDelayedFlag } from '@/ui/hooks/use-delayed-flag';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { GlassPanel } from '@/ui/surfaces/glass-panel';
import { HeroAmount } from '@/ui/text/hero-amount';
import { Amount, Caption, Display } from '@/ui/text/typography';

function PanelValue({ value, skeleton }: { value: string | null; skeleton: boolean }) {
  if (value === null) {
    return (
      <SkeletonLine tone="glass" w={76} visible={skeleton}>
        <Amount fontSize={17} fontWeight="700">
          0
        </Amount>
      </SkeletonLine>
    );
  }
  return (
    <Amount fontSize={17} fontWeight="700" color="onGlass">
      {value}
    </Amount>
  );
}

/** Total de la période sur verre. Tant que les statistiques chargent : place réservée, puis blocs fantômes si l'attente se prolonge. */
export function StatsSummaryCard({ stats, period }: { stats: Stats | undefined; period: StatsPeriod }) {
  const figures = periodFigures(stats, period);
  const skeleton = useDelayedFlag(!stats);
  return (
    <GlassCard {...(stats ? null : BUSY_A11Y)}>
      <Caption color="onGlassMuted">{figures.caption}</Caption>
      {stats ? (
        <HeroAmount cents={figures.totalCents} />
      ) : (
        <SkeletonLine tone="glass" w={168} radius={10} visible={skeleton}>
          <Display>0</Display>
        </SkeletonLine>
      )}
      <XStack gap="2">
        <GlassPanel
          accessible
          accessibilityLabel={`${figures.otherLabel} : ${figures.otherCents === null ? 'indisponible' : formatEuros(figures.otherCents)}`}
        >
          <Caption color="onGlassMuted">{figures.otherLabel}</Caption>
          <PanelValue value={figures.otherCents === null ? null : formatEuros(figures.otherCents)} skeleton={skeleton} />
        </GlassPanel>
        <GlassPanel accessible accessibilityLabel={`Exclus du total : ${stats ? subscriptionCount(stats.excludedCount) : 'indisponible'}`}>
          <Caption color="onGlassMuted">Exclus du total</Caption>
          <PanelValue value={stats ? subscriptionCount(stats.excludedCount) : null} skeleton={skeleton} />
        </GlassPanel>
      </XStack>
    </GlassCard>
  );
}
