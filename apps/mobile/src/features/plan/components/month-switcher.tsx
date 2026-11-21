import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { monthYearTitle } from '@/lib/dates';
import { RADIUS } from '@/theme/elevation';
import { IconButton } from '@/ui/controls/icon-button';
import { Label } from '@/ui/text/typography';

export function MonthSwitcher({ year, month, onShift }: { year: number; month: number; onShift: (delta: 1 | -1) => void }) {
  return (
    <XStack
      mx="4"
      items="center"
      justify="space-between"
      bg="glassInner"
      borderWidth={1}
      borderColor="glassEdge"
      rounded={RADIUS.pill}
      p="1"
    >
      <IconButton icon={ChevronLeft} label="Voir le mois précédent" variant="glass" onPress={() => onShift(-1)} />
      <Label fontSize={17} color="onGlass" accessibilityRole="header" accessibilityLiveRegion="polite" shrink={1} text="center">
        {monthYearTitle(year, month)}
      </Label>
      <IconButton icon={ChevronRight} label="Voir le mois suivant" variant="glass" onPress={() => onShift(1)} />
    </XStack>
  );
}
