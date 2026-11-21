import { todayIn } from '@abonnements/core';
import { XStack, YStack } from 'tamagui';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { eventLabel, reminderLabel } from '@/features/subscriptions/history';
import { dateShort } from '@/lib/dates';
import { Card } from '@/ui/surfaces/card';
import { Caption, Label, Overline } from '@/ui/text/typography';

/** Frise de l'historique : événements et rappels envoyés, le plus récent marqué. */
export function DetailHistory({ history }: { history: SubscriptionDetail['history'] }) {
  const today = todayIn();
  return (
    <YStack gap="2">
      <Overline px="1">Historique</Overline>
      <Card gap="3">
        {history.length === 0 ? <Caption>Aucun événement pour l’instant.</Caption> : null}
        {history.map((item, index) => (
          <XStack key={item.id} gap="3" items="flex-start">
            <YStack w={10} h={10} mt="1.5" rounded="full" bg={index === 0 ? 'primary' : 'borderControl'} />
            <YStack flex={1} gap="0.5">
              <Label>
                {item.kind === 'event'
                  ? eventLabel(item.event.type, item.event.payload, item.event.amount_cents)
                  : reminderLabel(item.reminder.kind)}
              </Label>
              <Caption>
                {item.kind === 'event' ? dateShort(item.date, today) : `${dateShort(item.date, today)} · notification envoyée`}
              </Caption>
            </YStack>
          </XStack>
        ))}
      </Card>
    </YStack>
  );
}
