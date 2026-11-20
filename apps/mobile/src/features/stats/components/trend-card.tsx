import { useState } from 'react';
import { XStack, YStack } from 'tamagui';
import type { TrendMonth } from '@/db/repositories/stats-trend';
import { isTrendEmpty, trendSelection, trendSummaryLabel } from '@/features/stats/trend-format';
import { haptic } from '@/ui/motion/haptics';
import { Card } from '@/ui/surfaces/card';
import { Amount, Body, Caption, CardTitle } from '@/ui/text/typography';
import { TrendChart } from './trend-chart';
import { TrendLegend } from './trend-legend';

/** Tendance sur douze mois : le mois touché s'affiche en toutes lettres au-dessus du graphique. */
export function TrendCard({ months }: { months: readonly TrendMonth[] }) {
  const last = months.length - 1;
  const [picked, setPicked] = useState<number | null>(null);
  const selectedIndex = picked !== null && picked <= last ? picked : last;
  const empty = isTrendEmpty(months);
  const selection = empty ? null : trendSelection(months[selectedIndex]);

  const select = (index: number) => {
    if (index !== selectedIndex) {
      haptic.select();
    }
    setPicked(index);
  };

  return (
    <Card lift gap="3">
      <CardTitle accessibilityLabel={trendSummaryLabel(months)}>Dépenses par mois</CardTitle>
      {selection ? (
        <>
          <YStack gap="1" accessible accessibilityLiveRegion="polite">
            <XStack gap="2" items="baseline" flexWrap="wrap">
              <Amount fontSize={20} fontWeight="700">
                {selection.amount}
              </Amount>
              <Caption>{selection.title}</Caption>
            </XStack>
            {selection.detail ? <Caption>{selection.detail}</Caption> : null}
          </YStack>
          <TrendChart months={months} selectedIndex={selectedIndex} onSelect={select} />
          <TrendLegend withPlanned={months.some((m) => m.plannedCents > 0)} />
        </>
      ) : (
        <Body color="colorMuted">Tes prélèvements confirmés apparaîtront ici, mois par mois.</Body>
      )}
    </Card>
  );
}
