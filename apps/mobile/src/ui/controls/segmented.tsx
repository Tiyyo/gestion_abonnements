import { Text, XStack, YStack } from 'tamagui';
import { elevated, RADIUS } from '@/theme/elevation';
import { haptic } from '@/ui/motion/haptics';

const RAISED = elevated('sm');

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  onGlass,
}: {
  label: string;
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Posé sur le dégradé du Hero : fond en verre, segment choisi blanc, texte aubergine. */
  onGlass?: boolean;
}) {
  return (
    <XStack
      bg={onGlass ? 'glassInner' : 'subtle'}
      borderWidth={onGlass ? 1 : 0}
      borderColor="glassEdge"
      rounded={RADIUS.pill}
      p="1"
      gap="1"
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <YStack
            key={o.key}
            flex={1}
            minH={44}
            items="center"
            justify="center"
            rounded={RADIUS.pill}
            bg={selected ? 'surface' : 'transparent'}
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
            <Text
              fontSize={15}
              fontWeight={selected ? '600' : '500'}
              color={selected ? (onGlass ? 'primary' : 'color') : onGlass ? 'onGlassMuted' : 'colorMuted'}
            >
              {o.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
