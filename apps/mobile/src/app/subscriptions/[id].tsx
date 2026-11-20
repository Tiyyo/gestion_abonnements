import { useLocalSearchParams } from 'expo-router';
import { ScrollView, YStack } from 'tamagui';
import { DetailActions } from '@/features/subscriptions/components/subscription-detail/detail-actions';
import { DetailBody } from '@/features/subscriptions/components/subscription-detail/detail-body';
import { DetailHero } from '@/features/subscriptions/components/subscription-detail/detail-hero';
import { DetailSkeleton } from '@/features/subscriptions/components/subscription-detail/detail-skeleton';
import { DetailPlaceholder } from '@/features/subscriptions/components/subscription-detail/detail-placeholder';
import { useSubscriptionDetail } from '@/features/subscriptions/hooks/use-subscription-detail';
import { HeroStatusBar } from '@/ui/navigation/hero-status-bar';
import { useHeroStatusBar } from '@/ui/navigation/use-hero-status-bar';

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const heroBar = useHeroStatusBar();
  const detail = useSubscriptionDetail(id);

  if (detail.isPending) {
    return <DetailSkeleton />;
  }
  if (!detail.data) {
    return <DetailPlaceholder />;
  }
  const { row, nextCharge, today } = detail.data;

  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={heroBar.past} />
      <ScrollView onScroll={heroBar.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 24 }}>
        <DetailHero row={row} nextCharge={nextCharge} today={today} />
        <DetailBody detail={detail.data} />
      </ScrollView>
      <DetailActions row={row} today={today} />
    </YStack>
  );
}
