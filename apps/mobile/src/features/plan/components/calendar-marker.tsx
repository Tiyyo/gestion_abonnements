import { Check, TriangleAlert } from 'lucide-react-native';
import { YStack } from 'tamagui';
import type { MarkerKind } from '@/features/plan/calendar-items';
import { colors } from '@/theme/colors';

const BOX = 12;

function Shape({ kind }: { kind: MarkerKind }) {
  switch (kind) {
    case 'trial':
      return <TriangleAlert color={colors.warn} size={BOX} strokeWidth={2.5} />;
    case 'payday':
      return <YStack w={8} h={8} bg="primary" style={{ transform: [{ rotate: '45deg' }] }} />;
    case 'transfer_todo':
      return <YStack w={10} h={10} rounded="full" borderWidth={2} borderColor="color" />;
    case 'transfer_done':
      return (
        <YStack w={BOX} h={BOX} rounded="full" bg="okText" items="center" justify="center">
          <Check color={colors.onPrimary} size={8} strokeWidth={4} />
        </YStack>
      );
    case 'charge':
      return <YStack w={6} h={6} rounded="full" bg="colorMuted" />;
  }
}

/** Repère du calendrier : chaque nature a sa forme et sa couleur (losange, anneau, pastille cochée, point, triangle). */
export function CalendarMarker({ kind }: { kind: MarkerKind }) {
  return (
    <YStack w={BOX} h={BOX} items="center" justify="center">
      <Shape kind={kind} />
    </YStack>
  );
}
