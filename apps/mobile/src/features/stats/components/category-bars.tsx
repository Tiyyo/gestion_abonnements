import { XStack, YStack } from 'tamagui';
import type { CategoryCost } from '@/db/repositories/stats';
import { barWidth, categoryAccessibilityLabel, categoryAmountLabel, categoryShare } from '@/features/stats/stats-derivations';
import { Amount, Label } from '@/ui/text/typography';

export function CategoryBars({ rows, total }: { rows: CategoryCost[]; total: number }) {
  return (
    <YStack gap="3">
      {rows.map((r) => {
        const pct = categoryShare(r.cents, total);
        return (
          <YStack key={r.category} gap="1" accessible accessibilityLabel={categoryAccessibilityLabel(r, pct)}>
            <XStack justify="space-between" gap="3">
              <Label shrink={1}>{r.category}</Label>
              <Amount fontWeight="400">{categoryAmountLabel(r, pct)}</Amount>
            </XStack>
            <YStack h={8} rounded="full" bg="subtle">
              <YStack h={8} rounded="full" bg="primary" w={barWidth(pct)} />
            </YStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
