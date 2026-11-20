import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { haptic } from '@/ui/motion/haptics';
import { Body } from '@/ui/text/typography';

export function SheetOption({
  label,
  hint,
  selected,
  leading,
  last,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  leading?: ReactNode;
  last?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <XStack
      minH={56}
      py="3"
      gap="3"
      items="center"
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      opacity="1 press:0.6"
      transition="fast"
      accessible
      tabIndex={0}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
    >
      {leading}
      <YStack flex={1} gap="0.5">
        <Body fontWeight={selected ? '600' : '400'}>{label}</Body>
        {hint ? (
          <Body fontSize={13} color="colorMuted">
            {hint}
          </Body>
        ) : null}
      </YStack>
      {selected ? <Check color={colors.primary} size={22} strokeWidth={2.5} /> : null}
    </XStack>
  );
}
