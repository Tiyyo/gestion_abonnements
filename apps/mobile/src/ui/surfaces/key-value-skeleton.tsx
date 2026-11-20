import type { DimensionValue } from 'react-native';
import { XStack } from 'tamagui';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { Amount, Body } from '@/ui/text/typography';

/** Ligne fantôme aux dimensions de `KeyValue`. */
export function KeyValueSkeleton({ labelW, valueW, last }: { labelW: DimensionValue; valueW: DimensionValue; last?: boolean }) {
  return (
    <XStack py="3" minH={52} gap="4" items="center" justify="space-between" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <SkeletonLine w={labelW}>
        <Body>0</Body>
      </SkeletonLine>
      <SkeletonLine w={valueW}>
        <Amount>0</Amount>
      </SkeletonLine>
    </XStack>
  );
}
