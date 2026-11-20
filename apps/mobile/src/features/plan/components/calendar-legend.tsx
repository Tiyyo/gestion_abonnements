import { XStack } from 'tamagui';
import { CalendarMarker } from './calendar-marker';
import type { MarkerKind } from '@/features/plan/calendar-items';
import { MARKER_LABELS } from '@/features/plan/calendar-labels';
import { Caption } from '@/ui/text/typography';

const ORDER: readonly MarkerKind[] = ['payday', 'transfer_todo', 'transfer_done', 'charge', 'trial'];

/** Légende des repères, sous la grille. */
export function CalendarLegend() {
  return (
    <XStack flexWrap="wrap" columnGap="3" rowGap="1" px="2" pt="3" borderTopWidth={1} borderColor="borderColor">
      {ORDER.map((kind) => (
        <XStack key={kind} items="center" gap="1.5">
          <CalendarMarker kind={kind} />
          <Caption>{MARKER_LABELS[kind]}</Caption>
        </XStack>
      ))}
    </XStack>
  );
}
