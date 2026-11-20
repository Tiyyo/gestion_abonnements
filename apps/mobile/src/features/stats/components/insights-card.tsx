import { type LucideIcon, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import type { ChangeDirection, Insights } from '@/features/stats/trend-insights';
import { colors } from '@/theme/colors';
import { Card } from '@/ui/surfaces/card';
import { KeyValue } from '@/ui/surfaces/key-value';
import { Body, CardTitle } from '@/ui/text/typography';

const CHANGE_ICON: Record<ChangeDirection, LucideIcon> = { up: TrendingUp, down: TrendingDown, flat: Minus };

/** Enseignements : coût annuel, écart avec le mois précédent (flèche et mots, sans code couleur), moyenne, plus cher. */
export function InsightsCard({ insights }: { insights: Insights }) {
  const { change } = insights;
  const ChangeIcon = change ? CHANGE_ICON[change.direction] : null;
  const rows = [
    insights.average && { label: insights.average.label, value: insights.average.value },
    insights.top && { label: `Le plus cher : ${insights.top.name}`, value: insights.top.value },
    insights.next && { label: insights.next.label, value: insights.next.value },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <Card py="0" gap="0">
      <YStack py="4" gap="2" borderBottomWidth={rows.length > 0 ? 1 : 0} borderColor="borderColor">
        <CardTitle>{insights.yearly ?? 'En bref'}</CardTitle>
        {change && ChangeIcon ? (
          <XStack gap="2" items="center">
            <ChangeIcon size={18} color={colors.text} />
            <Body shrink={1}>{change.text}</Body>
          </XStack>
        ) : null}
      </YStack>
      {rows.map((row, i) => (
        <KeyValue key={row.label} label={row.label} value={row.value} last={i === rows.length - 1} />
      ))}
    </Card>
  );
}
