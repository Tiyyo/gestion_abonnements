import { todayIn } from '@abonnements/core';
import { router, useIsFocused } from 'expo-router';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import { HomeFeed } from '@/features/home/components/home-feed';
import { HomeFeedSkeleton } from '@/features/home/components/home-feed-skeleton';
import { HomeHero } from '@/features/home/components/home-hero';
import { HERO_OVERLAP } from '@/features/home/constants';
import { pendingTransfersCents } from '@/features/home/home-wording';
import { useDailyMaintenance } from '@/features/home/hooks/use-daily-maintenance';
import { useHome } from '@/features/home/hooks/use-home';
import { useHomeActions } from '@/features/home/hooks/use-home-actions';
import { useHomeRefresh } from '@/features/home/hooks/use-home-refresh';
import { colors } from '@/theme/colors';
import { ActionButton } from '@/ui/controls/action-button';
import { EmptyState } from '@/ui/feedback/empty-state';
import { useDelayedFlag } from '@/ui/hooks/use-delayed-flag';
import { HeroStatusBar } from '@/ui/navigation/hero-status-bar';
import { TAB_BAR_CLEARANCE } from '@/ui/navigation/tab-bar/tab-bar-metrics';
import { useHeroStatusBar } from '@/ui/navigation/use-hero-status-bar';

export default function HomeScreen() {
  useDailyMaintenance();
  const insets = useSafeAreaInsets();
  const heroBar = useHeroStatusBar();
  const focused = useIsFocused();
  const today = todayIn();
  const home = useHome();
  const actions = useHomeActions();
  const { refreshing, refresh } = useHomeRefresh(home.refetch);
  const data = home.data;
  const showSkeleton = useDelayedFlag(!data);

  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={heroBar.past} active={focused} />
      <ScrollView
        onScroll={heroBar.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} progressViewOffset={insets.top} />
        }
      >
        <HomeHero today={today} showBalances={!!data && !data.isEmpty} pendingTransfersCents={pendingTransfersCents(data)} />

        <YStack px="4" gap="3" mt={-HERO_OVERLAP}>
          {!data ? (
            showSkeleton ? (
              <HomeFeedSkeleton />
            ) : null
          ) : data.isEmpty ? (
            <EmptyState
              message="Ajoute tes abonnements pour voir ici les transferts à faire et les essais à surveiller."
              action={<ActionButton label="Ajouter un premier abonnement" onPress={() => router.push('/subscriptions/new')} />}
            />
          ) : (
            <HomeFeed data={data} today={today} actions={actions} />
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
