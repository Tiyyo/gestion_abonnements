import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import { DetailActions } from '@/features/subscriptions/components/subscription-detail/detail-actions';
import { DetailHeader } from '@/features/subscriptions/components/subscription-detail/detail-header';
import { DetailHistory } from '@/features/subscriptions/components/subscription-detail/detail-history';
import { DetailInfoCard } from '@/features/subscriptions/components/subscription-detail/detail-info-card';
import { DetailNotFound } from '@/features/subscriptions/components/subscription-detail/detail-not-found';
import { DetailSkeleton } from '@/features/subscriptions/components/subscription-detail/detail-skeleton';
import { PriceHistoryCard } from '@/features/subscriptions/components/subscription-detail/price-history-card';
import { StatusNotice } from '@/features/subscriptions/components/subscription-detail/status-notice';
import { useSubscriptionDetail } from '@/features/subscriptions/hooks/use-subscription-detail';
import { TOP_GAP } from '@/theme/layout';
import { ActionButton } from '@/ui/controls/action-button';
import { StackHeader } from '@/ui/navigation/stack-header';

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const detail = useSubscriptionDetail(id);

  if (detail.isPending) {
    return <DetailSkeleton />;
  }
  if (!detail.data) {
    return <DetailNotFound />;
  }
  const { row, settings, nextCharge, history, priceHistory, provisionedCents, trialRisk, today } = detail.data;

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <StackHeader
        trailing={<ActionButton label="Modifier" variant="ghost" onPress={() => router.push(`/subscriptions/edit/${row.id}`)} />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}>
        <DetailHeader row={row} />
        <StatusNotice row={row} trialRisk={trialRisk} today={today} />
        <DetailInfoCard row={row} settings={settings} nextCharge={nextCharge} provisionedCents={provisionedCents} />
        <PriceHistoryCard row={row} priceHistory={priceHistory} />
        <DetailHistory history={history} />
      </ScrollView>
      <DetailActions row={row} today={today} />
    </YStack>
  );
}
