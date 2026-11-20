import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import type { Stats } from '@/db/repositories/stats';
import { HERO_OVERLAP } from '@/features/stats/constants';
import type { StatsPeriod } from '@/features/stats/types';
import { TOP_GAP } from '@/theme/layout';
import { Segmented } from '@/ui/controls/segmented';
import { StackHeader } from '@/ui/navigation/stack-header';
import { Hero } from '@/ui/surfaces/hero';
import { StatsSummaryCard } from './stats-summary-card';

interface Props {
  stats: Stats | undefined;
  period: StatsPeriod;
  onPeriodChange: (period: StatsPeriod) => void;
}

export function StatsHero({ stats, period, onPeriodChange }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Hero pt={insets.top + TOP_GAP.stack} pb={HERO_OVERLAP + 20} gap="4">
      <StackHeader onHero title="Statistiques" />
      <YStack px="4" gap="3">
        <Segmented
          onGlass
          label="Période"
          value={period}
          onChange={onPeriodChange}
          options={[
            { key: 'month', label: 'Mensuel' },
            { key: 'year', label: 'Annuel' },
          ]}
        />
        <StatsSummaryCard stats={stats} period={period} />
      </YStack>
    </Hero>
  );
}
