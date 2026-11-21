import { Button, XStack, YStack } from 'tamagui';
import { haptic } from '@/ui/motion/haptics';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Sur le verre, le jour choisi reprend le segment blanc de `Segmented onGlass` (texte aubergine).
const LIGHT = { bg: 'surface', border: 'borderControl', fg: 'color', selectedBg: 'primary', selectedFg: 'onPrimary' } as const;
const GLASS = { bg: 'glassInner', border: 'glassEdge', fg: 'onGlass', selectedBg: 'surface', selectedFg: 'primary' } as const;

export function PaydayGrid({ value, onChange, onGlass }: { value: number; onChange: (day: number) => void; onGlass?: boolean }) {
  const look = onGlass ? GLASS : LIGHT;
  return (
    <XStack flexWrap="wrap" py="1" mx={-3} accessibilityRole="radiogroup" accessibilityLabel="Jour de paie">
      {DAYS.map((day) => (
        <YStack key={day} w="14.2857%" p={3}>
          {/* Cellule de 42 px de large dans une carte de Réglages : la marge de 3 px autour la porte à 48 × 50 sans chevauchement. */}
          <Button
            h={44}
            hitSlop={3}
            p="0"
            rounded="lg"
            bg={value === day ? look.selectedBg : look.bg}
            borderWidth={1}
            borderColor={value === day ? look.selectedBg : look.border}
            scale="1 press:0.985"
            transition="fast"
            onPress={() => {
              haptic.select();
              onChange(day);
            }}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={`Jour ${day}`}
            accessibilityState={{ checked: value === day }}
          >
            <Button.Text color={value === day ? look.selectedFg : look.fg} fontWeight="600" fontVariant={['tabular-nums']}>
              {String(day)}
            </Button.Text>
          </Button>
        </YStack>
      ))}
    </XStack>
  );
}
