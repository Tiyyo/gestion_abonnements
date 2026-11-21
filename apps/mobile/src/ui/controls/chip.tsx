import { Button } from 'tamagui';
import { haptic } from '@/ui/motion/haptics';

/**
 * Puce de choix. `mode="multiple"` (défaut) : case à cocher, plusieurs puces cochées à la fois ;
 * `mode="single"` : bouton radio d'un groupe. `accessibilityLabel` : libellé lu à la place d'une abréviation (« J-1 »).
 */
export function Chip({
  label,
  selected,
  onPress,
  mode = 'multiple',
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  mode?: 'multiple' | 'single';
  accessibilityLabel?: string;
}) {
  return (
    <Button
      minH={44}
      px="4"
      rounded="full"
      borderWidth={1}
      borderColor={selected ? 'primary' : 'borderControl'}
      backgroundColor={selected ? 'secondary' : 'surface'}
      scale="1 press:0.985"
      transition="fast"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessible
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
    >
      <Button.Text color={selected ? 'onSecondary' : 'color'} fontSize={15} fontWeight={selected ? '700' : '500'}>
        {label}
      </Button.Text>
    </Button>
  );
}
