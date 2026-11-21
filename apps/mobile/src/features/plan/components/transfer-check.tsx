import { Check } from 'lucide-react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Button, YStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { easeOut } from '@/ui/motion/easing';

/** Case à cocher ronde d'un transfert (zone tactile de 56 × 64). */
export function TransferCheck({
  done,
  disabled,
  label,
  onPress,
}: {
  done: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Button
      w={56}
      h={64}
      p="0"
      bg="transparent"
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      testID="plan.transfer-check"
    >
      <YStack
        w={26}
        h={26}
        rounded="full"
        borderWidth={2}
        borderColor={done ? 'okText' : 'borderControl'}
        bg={done ? 'okText' : 'transparent'}
        items="center"
        justify="center"
        transition="smooth"
      >
        {done && (
          <Animated.View entering={ZoomIn.duration(160).easing(easeOut)}>
            <Check color={colors.surface} size={16} strokeWidth={3} />
          </Animated.View>
        )}
      </YStack>
    </Button>
  );
}
