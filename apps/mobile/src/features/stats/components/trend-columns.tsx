import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import type { TrendMonth } from '@/db/repositories/stats-trend';
import { monthShortLabel, trendColumnLabel } from '@/features/stats/trend-format';
import { CHART, CHART_HEIGHT } from '@/features/stats/trend-scale';
import { Caption } from '@/ui/text/typography';

interface Props {
  months: readonly TrendMonth[];
  columnWidth: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** Colonnes tactiles posées sur le tracé : une par mois, sur toute la hauteur, avec le libellé du mois en pied. */
export function TrendColumns({ months, columnWidth, selectedIndex, onSelect }: Props) {
  return (
    <XStack position="absolute" t={0} l={0}>
      {months.map((m, i) => {
        const selected = i === selectedIndex;
        return (
          <Pressable
            key={m.month}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityLabel={trendColumnLabel(m)}
            accessibilityState={{ selected }}
            style={{ width: columnWidth, height: CHART_HEIGHT, justifyContent: 'flex-end' }}
          >
            <YStack h={CHART.labelHeight} items="center" justify="center">
              <Caption numberOfLines={1} color={selected ? 'color' : 'colorMuted'} fontWeight={selected ? '700' : '400'}>
                {monthShortLabel(m.month)}
              </Caption>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
