import { Text, XStack, YStack } from 'tamagui';
import { elevated, RADIUS } from './elevation';
import { haptic } from './motion';

const RAISED = elevated('sm');

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <XStack bg="subtle" rounded={RADIUS.control + 4} p="1" gap="1" accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <YStack
            key={o.key}
            flex={1}
            minH={44}
            items="center"
            justify="center"
            rounded={RADIUS.control}
            bg={selected ? 'surface' : 'subtle'}
            style={selected ? RAISED : undefined}
            transition="fast"
            onPress={() => {
              if (!selected) {
                haptic.select();
                onChange(o.key);
              }
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
          >
            <Text fontSize={15} fontWeight={selected ? '600' : '500'} color={selected ? 'color' : 'colorMuted'}>
              {o.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
