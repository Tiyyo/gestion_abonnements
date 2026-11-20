import { XStack, YStack } from 'tamagui';
import { CalendarDayCell } from './calendar-day-cell';
import { CalendarLegend } from './calendar-legend';
import { monthMatrix, WEEKDAY_INITIALS } from '@/features/plan/calendar-grid';
import type { DayItemsByDate } from '@/features/plan/calendar-items';
import { Card } from '@/ui/surfaces/card';
import { Caption } from '@/ui/text/typography';

/** Grille du mois : en-tête L M M J V S D, une ligne par semaine (7 colonnes égales), puis la légende. */
export function MonthGrid({
  year,
  month,
  today,
  items,
  selected,
  onSelect,
}: {
  year: number;
  month: number;
  today: string;
  items: DayItemsByDate;
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <Card p="2" pb="3" gap="1">
      <XStack accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <YStack key={index} flex={1} h={28} items="center" justify="center">
            <Caption fontWeight="600" color={index >= 5 ? 'colorMuted' : 'color'}>
              {initial}
            </Caption>
          </YStack>
        ))}
      </XStack>
      {monthMatrix(year, month).map((week) => (
        <XStack key={week[0]?.date}>
          {week.map((day) => (
            <CalendarDayCell
              key={day.date}
              day={day}
              items={items.get(day.date)}
              today={today}
              selected={day.inMonth && day.date === selected}
              onSelect={onSelect}
            />
          ))}
        </XStack>
      ))}
      <CalendarLegend />
    </Card>
  );
}
