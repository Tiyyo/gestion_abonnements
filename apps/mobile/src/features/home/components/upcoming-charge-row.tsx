import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import { YStack } from 'tamagui';
import type { HomeUpcoming } from '@/db/repositories/home/types';
import { dayOfMonth, upcomingAccessibilityLabel, upcomingCaption } from '@/features/home/home-wording';
import { monthTile } from '@/lib/dates';
import { ListCard } from '@/ui/surfaces/list-card';
import { Amount, Caption, Label, Overline } from '@/ui/text/typography';

export function UpcomingChargeRow({ upcoming }: { upcoming: HomeUpcoming }) {
  return (
    <ListCard
      onPress={() => router.push(`/subscriptions/${upcoming.subscriptionId}`)}
      testID="home.upcoming-row"
      accessibilityLabel={upcomingAccessibilityLabel(upcoming)}
      accessibilityHint="Ouvre la fiche de l’abonnement"
    >
      <YStack w={44} items="center">
        <Amount fontSize={20} fontWeight="700">
          {dayOfMonth(upcoming.dueDate)}
        </Amount>
        <Overline fontSize={11}>{monthTile(upcoming.dueDate)}</Overline>
      </YStack>
      <YStack flex={1} gap="0.5">
        <Label>{upcoming.name}</Label>
        <Caption color={upcoming.funded ? 'okText' : 'colorMuted'}>{upcomingCaption(upcoming)}</Caption>
      </YStack>
      <Amount>{formatEuros(upcoming.amountCents)}</Amount>
    </ListCard>
  );
}
