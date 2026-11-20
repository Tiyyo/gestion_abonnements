import { XStack, YStack } from 'tamagui';
import { CalendarMarker } from './calendar-marker';
import type { CalendarDay } from '@/features/plan/calendar-grid';
import { dayMarkers, type DayItem } from '@/features/plan/calendar-items';
import { dayAccessibilityLabel } from '@/features/plan/calendar-labels';
import { Caption, Label } from '@/ui/text/typography';

const NO_ITEMS: DayItem[] = [];

/** Case d'un jour : numéro (cerclé aujourd'hui, plein s'il est choisi) et jusqu'à trois repères. Zone tactile ≥ 44 px. */
export function CalendarDayCell({
  day,
  items = NO_ITEMS,
  today,
  selected,
  onSelect,
}: {
  day: CalendarDay;
  items?: DayItem[];
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  if (!day.inMonth) {
    return (
      <YStack flex={1} minH={52} pt="1" items="center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <YStack h={34} justify="center">
          <Caption color="borderControl">{day.day}</Caption>
        </YStack>
      </YStack>
    );
  }
  const off = day.weekend || day.holiday;
  return (
    <YStack
      flex={1}
      minH={52}
      pt="1"
      gap="0.5"
      items="center"
      onPress={() => onSelect(day.date)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={dayAccessibilityLabel(day, items, today)}
    >
      <YStack
        w={34}
        h={34}
        rounded="full"
        items="center"
        justify="center"
        bg={selected ? 'primary' : day.holiday ? 'subtle' : 'transparent'}
        borderWidth={2}
        borderColor={day.date === today ? 'primary' : 'transparent'}
        transition="fast"
      >
        <Label color={selected ? 'onPrimary' : off ? 'colorMuted' : 'color'} fontWeight={off && !selected ? '400' : '600'}>
          {day.day}
        </Label>
      </YStack>
      <XStack h={12} gap="0.5" items="center">
        {dayMarkers(items).map((kind) => (
          <CalendarMarker key={kind} kind={kind} />
        ))}
      </XStack>
    </YStack>
  );
}
