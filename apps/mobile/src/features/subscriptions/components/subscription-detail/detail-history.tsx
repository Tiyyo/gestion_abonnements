import { XStack, YStack } from 'tamagui';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { eventLabel, reminderLabel } from '@/features/subscriptions/history';
import { formatDayMonth } from '@/lib/format';
import { Caption, Heading, Label } from '@/ui/text/typography';

/** Frise de l'historique : événements et rappels envoyés, le plus récent marqué. */
export function DetailHistory({ history }: { history: SubscriptionDetail['history'] }) {
  return (
    <YStack gap="3">
      <Heading>Historique</Heading>
      {history.map((item, index) => (
        <XStack key={item.id} gap="3" items="flex-start">
          <YStack w={10} h={10} mt="1.5" rounded="full" bg={index === 0 ? 'primary' : 'borderControl'} />
          <YStack flex={1} gap="0.5">
            <Label>
              {item.kind === 'event'
                ? eventLabel(item.event.type, item.event.payload, item.event.amount_cents)
                : reminderLabel(item.reminder.kind)}
            </Label>
            <Caption>{item.kind === 'event' ? formatDayMonth(item.date) : `${formatDayMonth(item.date)} · notification envoyée`}</Caption>
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}
