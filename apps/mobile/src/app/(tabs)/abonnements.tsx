import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Spinner, YStack } from 'tamagui';
import { SubscriptionList } from '@/features/subscriptions/components/subscription-list/subscription-list';
import { SubscriptionsHero } from '@/features/subscriptions/components/subscription-list/subscriptions-hero';
import { useSubscriptionGroups } from '@/features/subscriptions/hooks/use-subscription-groups';
import { ActionButton } from '@/ui/controls/action-button';
import { EmptyState } from '@/ui/feedback/empty-state';

export default function SubscriptionsScreen() {
  const focused = useIsFocused();
  const { isPending, isEmpty, groups, cancelled, ongoingCount, globalMarginBp } = useSubscriptionGroups();

  return (
    <YStack flex={1} bg="background">
      {focused ? <StatusBar style="light" /> : null}
      <SubscriptionsHero count={ongoingCount} />
      {isPending ? (
        <Spinner mt="8" color="primary" />
      ) : isEmpty ? (
        <EmptyState
          message="Aucun abonnement pour le moment."
          action={<ActionButton label="Ajouter un premier abonnement" onPress={() => router.push('/subscriptions/new')} />}
        />
      ) : (
        <SubscriptionList groups={groups} cancelled={cancelled} globalMarginBp={globalMarginBp} />
      )}
    </YStack>
  );
}
