import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Spinner, YStack } from 'tamagui';
import { SubscriptionList } from '@/features/subscriptions/components/subscription-list/subscription-list';
import { SubscriptionsHero } from '@/features/subscriptions/components/subscription-list/subscriptions-hero';
import { useSubscriptionGroups } from '@/features/subscriptions/hooks/use-subscription-groups';
import { DEFAULT_SORT, type SubscriptionSort } from '@/features/subscriptions/subscription-view';
import { ActionButton } from '@/ui/controls/action-button';
import { EmptyState } from '@/ui/feedback/empty-state';

export default function SubscriptionsScreen() {
  const focused = useIsFocused();
  // Recherche et tri vivent le temps de la session : l'onglet reste monté, rien n'est enregistré en base.
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SubscriptionSort>(DEFAULT_SORT);
  const { isPending, isEmpty, view, ongoingCount, globalMarginBp } = useSubscriptionGroups(query, sort);

  return (
    <YStack flex={1} bg="background">
      {focused ? <StatusBar style="light" /> : null}
      <SubscriptionsHero count={ongoingCount} search={view.toolsVisible ? { value: query, onChange: setQuery } : undefined} />
      {isPending ? (
        <Spinner mt="8" color="primary" />
      ) : isEmpty ? (
        <EmptyState
          message="Aucun abonnement pour le moment."
          action={<ActionButton label="Ajouter un premier abonnement" onPress={() => router.push('/subscriptions/new')} />}
        />
      ) : (
        <SubscriptionList view={view} globalMarginBp={globalMarginBp} sort={sort} onSort={setSort} onClearSearch={() => setQuery('')} />
      )}
    </YStack>
  );
}
