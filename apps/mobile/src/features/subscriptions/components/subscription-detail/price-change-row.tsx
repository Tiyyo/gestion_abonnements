import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import {
  changeAccessibilityLabel,
  changeAmounts,
  changeCaption,
  changeDelta,
  directionLabel,
  type PriceChangeItem,
} from '@/features/subscriptions/price-history';
import { useColors } from '@/theme/use-colors';
import { Amount, Body, Caption, Label } from '@/ui/text/typography';

/** Un changement de prix : sens (icône et mot), écart en euros et en pourcentage, montants et date. */
export function PriceChangeRow({ item, first }: { item: PriceChangeItem; first: boolean }) {
  const colors = useColors();
  const up = item.direction === 'up';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <XStack
      py="3"
      gap="3"
      items="flex-start"
      borderTopWidth={first ? 0 : 1}
      borderColor="borderColor"
      accessible
      accessibilityLabel={changeAccessibilityLabel(item)}
    >
      <YStack w={32} h={32} rounded="full" items="center" justify="center" bg={up ? 'warnBg' : 'okBg'}>
        <Icon color={up ? colors.warn : colors.ok} size={18} strokeWidth={2.25} />
      </YStack>
      <YStack flex={1} gap="0.5">
        <XStack gap="3" items="center" justify="space-between">
          <Label>{directionLabel(item)}</Label>
          <Amount text="right" shrink={1}>
            {changeDelta(item)}
          </Amount>
        </XStack>
        <Body>{changeAmounts(item)}</Body>
        <Caption>{changeCaption(item)}</Caption>
      </YStack>
    </XStack>
  );
}
