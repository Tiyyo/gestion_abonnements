import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { lineAccessibilityLabel, lineSubtitle, periodSuffix } from '@/features/subscriptions/subscription-groups';
import { testIdSlug } from '@/lib/test-id';
import { Amount, Caption, Label } from '@/ui/text/typography';

export function SubscriptionLine({ row, globalMarginBp, last }: { row: SubscriptionRow; globalMarginBp: number; last: boolean }) {
  const color = row.status === 'cancelled' ? 'colorMuted' : 'color';
  return (
    <XStack
      py="3"
      gap="3"
      items="center"
      minH={64}
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={() => router.push(`/subscriptions/${row.id}`)}
      testID={`subscriptions.row-${testIdSlug(row.name)}`}
      opacity="1 press:0.6"
      transition="fast"
      accessible
      tabIndex={0}
      accessibilityRole="button"
      accessibilityLabel={lineAccessibilityLabel(row, globalMarginBp)}
      accessibilityHint="Ouvre la fiche"
    >
      <SubscriptionAvatar name={row.name} iconKey={row.icon_key} />
      <YStack flex={1} gap="0.5">
        <Label fontSize={16} numberOfLines={2} color={color}>
          {row.name}
        </Label>
        <Caption numberOfLines={2}>
          {row.category_name} · {lineSubtitle(row, globalMarginBp)}
        </Caption>
      </YStack>
      <YStack items="flex-end">
        <Amount fontSize={16} color={color}>
          {formatEuros(row.amount_cents)}
        </Amount>
        <Caption>{periodSuffix(row)}</Caption>
      </YStack>
    </XStack>
  );
}
