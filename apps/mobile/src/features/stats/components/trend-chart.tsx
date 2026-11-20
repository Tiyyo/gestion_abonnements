import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { XStack, YStack } from 'tamagui';
import type { TrendMonth } from '@/db/repositories/stats-trend';
import { trendSummaryLabel, trendTotalCents } from '@/features/stats/trend-format';
import { CHART_HEIGHT, columnWidth, niceMaxCents } from '@/features/stats/trend-scale';
import { TrendAxis } from './trend-axis';
import { TrendBars } from './trend-bars';
import { TrendColumns } from './trend-columns';

interface Props {
  months: readonly TrendMonth[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Douze barres mensuelles. Les colonnes font au moins 44 px : sur un téléphone le graphique défile
 * horizontalement, calé à droite sur le mois en cours ; l'axe en euros reste fixe.
 */
export function TrendChart({ months, selectedIndex, onSelect }: Props) {
  const [viewport, setViewport] = useState(0);
  const axisMaxCents = niceMaxCents(Math.max(0, ...months.map(trendTotalCents)));
  const colW = columnWidth(viewport, months.length);
  const contentWidth = colW * months.length;

  return (
    <XStack accessibilityLabel={trendSummaryLabel(months)}>
      <TrendAxis axisMaxCents={axisMaxCents} />
      <YStack flex={1} h={CHART_HEIGHT} onLayout={(e) => setViewport(Math.floor(e.nativeEvent.layout.width))}>
        {viewport > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            contentOffset={{ x: Math.max(contentWidth - viewport, 0), y: 0 }}
          >
            <View style={{ width: contentWidth, height: CHART_HEIGHT }}>
              <TrendBars months={months} axisMaxCents={axisMaxCents} columnWidth={colW} selectedIndex={selectedIndex} />
              <TrendColumns months={months} columnWidth={colW} selectedIndex={selectedIndex} onSelect={onSelect} />
            </View>
          </ScrollView>
        ) : null}
      </YStack>
    </XStack>
  );
}
