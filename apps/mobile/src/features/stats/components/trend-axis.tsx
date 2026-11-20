import { formatEuros } from '@abonnements/core';
import { YStack } from 'tamagui';
import { CHART, CHART_HEIGHT, gridTicks, yForCents } from '@/features/stats/trend-scale';
import { Amount } from '@/ui/text/typography';

const LABEL_BOX = 20;

/** Libellés en euros des repères, fixes à gauche pendant que les barres défilent. Décoratifs pour le lecteur d'écran. */
export function TrendAxis({ axisMaxCents }: { axisMaxCents: number }) {
  return (
    <YStack w={CHART.axisWidth} h={CHART_HEIGHT} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {gridTicks(axisMaxCents).map((tick) => (
        <YStack
          key={tick}
          position="absolute"
          l={0}
          r={8}
          t={yForCents(tick, axisMaxCents) - LABEL_BOX / 2}
          h={LABEL_BOX}
          justify="center"
          items="flex-end"
        >
          <Amount fontSize={12} fontWeight="400" color="colorMuted" numberOfLines={1}>
            {formatEuros(tick)}
          </Amount>
        </YStack>
      ))}
    </YStack>
  );
}
