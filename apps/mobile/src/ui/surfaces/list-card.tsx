import { XStack, type YStackProps } from 'tamagui';
import { RADIUS } from '@/theme/elevation';
import { useShadows } from '@/theme/use-shadows';

export function ListCard({ children, onPress, accessibilityLabel, ...props }: YStackProps & { onPress?: () => void }) {
  const shadow = useShadows();
  return (
    <XStack
      bg="surface"
      borderWidth={1}
      borderColor="transparent"
      rounded={RADIUS.row}
      px="3"
      py="3"
      gap="3"
      items="center"
      minH={64}
      style={{ boxShadow: shadow.md }}
      onPress={onPress}
      opacity={onPress ? '1 press:0.85' : undefined}
      scale={onPress ? '1 press:0.985' : undefined}
      transition="fast"
      accessibilityRole={onPress ? 'button' : undefined}
      accessible={onPress ? true : undefined}
      tabIndex={onPress ? 0 : undefined}
      accessibilityLabel={accessibilityLabel}
      {...(props as object)}
    >
      {children}
    </XStack>
  );
}
