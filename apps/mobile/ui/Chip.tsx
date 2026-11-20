import { Button } from 'tamagui';
import { haptic } from './motion';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Button.Text color={selected ? 'onSecondary' : 'color'} fontSize={15} fontWeight={selected ? '700' : '500'}>
        {label}
      </Button.Text>
    </Button>
  );
}
