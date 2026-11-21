import { formatEuros } from '@abonnements/core';
import { useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { XStack, YStack } from 'tamagui';
import { stepChart } from '@/features/subscriptions/price-chart';
import { chartAccessibilityLabel, type PriceChangeItem, priceLevels } from '@/features/subscriptions/price-history';
import { useColors } from '@/theme/use-colors';
import { Amount, Caption } from '@/ui/text/typography';

const HEIGHT = 64;
const PAD = 6;

/** Graphique en escalier des paliers de prix, avec le premier et le dernier montant en légende. */
export function PriceStepChart({ changes }: { changes: readonly PriceChangeItem[] }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const levels = priceLevels(changes);
  if (levels.length < 2) {
    return null;
  }
  const chart = stepChart(levels, { width, height: HEIGHT, pad: PAD });
  return (
    <YStack gap="1" accessible accessibilityRole="image" accessibilityLabel={chartAccessibilityLabel(changes)}>
      <YStack h={HEIGHT} onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
        {chart ? (
          <Svg width={width} height={HEIGHT}>
            <Path d={chart.path} stroke={colors.primaryText} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            <Circle cx={chart.end.x} cy={chart.end.y} r={4.5} fill={colors.primaryText} stroke={colors.surface} strokeWidth={2} />
          </Svg>
        ) : null}
      </YStack>
      <XStack justify="space-between" gap="3">
        <Caption>{formatEuros(levels[0] ?? 0)}</Caption>
        <Amount>{formatEuros(levels[levels.length - 1] ?? 0)}</Amount>
      </XStack>
    </YStack>
  );
}
