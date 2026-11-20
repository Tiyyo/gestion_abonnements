import { XStack, YStack } from 'tamagui';
import { Caption } from '@/ui/text/typography';

/** Légende du graphique : la part prévue se distingue par son contour pointillé, pas seulement par sa teinte. */
export function TrendLegend({ withPlanned }: { withPlanned: boolean }) {
  return (
    <XStack gap="4" items="center" flexWrap="wrap">
      <XStack gap="2" items="center">
        <YStack w={12} h={12} rounded={3} bg="primary" />
        <Caption>Payé</Caption>
      </XStack>
      {withPlanned ? (
        <XStack gap="2" items="center">
          <YStack w={12} h={12} rounded={3} bg="primarySoft" borderWidth={1.5} borderStyle="dashed" borderColor="primary" />
          <Caption>À venir</Caption>
        </XStack>
      ) : null}
    </XStack>
  );
}
