import type { LucideIcon } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { haptic } from '@/ui/motion/haptics';

export function StepButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <YStack
      w={44}
      h={44}
      rounded="full"
      items="center"
      justify="center"
      bg="subtle"
      scale="1 press:0.985"
      transition="fast"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessible
      tabIndex={0}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon color={colors.text} size={18} />
    </YStack>
  );
}
