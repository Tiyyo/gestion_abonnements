import { CalendarDays } from 'lucide-react-native';
import { Button } from 'tamagui';
import { colors } from '@/theme/colors';
import { RADIUS } from '@/theme/elevation';

export function DateField({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Button
      minH={48}
      rounded={RADIUS.control}
      justify="flex-start"
      gap="2"
      bg="surface"
      borderWidth={1}
      borderColor="borderControl"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `Date : ${label}. Modifier`}
    >
      <CalendarDays color={colors.muted} size={20} />
      <Button.Text fontSize={16} color="color">
        {label}
      </Button.Text>
    </Button>
  );
}
