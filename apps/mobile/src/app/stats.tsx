import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Spinner, YStack } from 'tamagui';
import { StatsCards } from '@/features/stats/components/stats-cards';
import { StatsHero } from '@/features/stats/components/stats-hero';
import { HERO_OVERLAP } from '@/features/stats/constants';
import { useMonthlyTrend } from '@/features/stats/hooks/use-monthly-trend';
import { useStats } from '@/features/stats/hooks/use-stats';
import type { StatsPeriod } from '@/features/stats/types';
import { HeroStatusBar } from '@/ui/navigation/hero-status-bar';
import { useHeroStatusBar } from '@/ui/navigation/use-hero-status-bar';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const heroBar = useHeroStatusBar();
  const stats = useStats();
  const trend = useMonthlyTrend();
  const [tab, setTab] = useState<StatsPeriod>('month');
  const s = stats.data;

  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={heroBar.past} />
      <ScrollView onScroll={heroBar.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <StatsHero stats={s} period={tab} onPeriodChange={setTab} />

        <YStack px="4" gap="3" mt={-HERO_OVERLAP}>
          {s && trend.data ? <StatsCards stats={s} trend={trend.data} period={tab} /> : <Spinner mt="8" color="primary" />}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
