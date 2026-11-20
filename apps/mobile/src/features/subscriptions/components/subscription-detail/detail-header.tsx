import { XStack, YStack } from 'tamagui';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { StatusBadge } from '@/features/subscriptions/components/status-badge';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { Body, ScreenTitle } from '@/ui/text/typography';

export function DetailHeader({ row }: { row: SubscriptionRow }) {
  return (
    <XStack gap="3" items="center">
      <SubscriptionAvatar name={row.name} iconKey={row.icon_key} size={56} />
      <YStack flex={1} gap="0.5">
        <ScreenTitle numberOfLines={2}>{row.name}</ScreenTitle>
        <Body color="colorMuted">{row.category_name}</Body>
      </YStack>
      <StatusBadge status={row.status} />
    </XStack>
  );
}
