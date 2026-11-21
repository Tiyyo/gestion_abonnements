import { Text, XStack, YStack } from 'tamagui';
import { RADIUS } from '@/theme/elevation';
import { useShadows } from '@/theme/use-shadows';
import { haptic } from '@/ui/motion/haptics';

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  onGlass,
  testID,
}: {
  label: string;
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Posé sur le dégradé du Hero : fond en verre, segment choisi en relief (`raised`), texte aubergine (`primaryText`). */
  onGlass?: boolean;
  /** Préfixe des sélecteurs de test : chaque segment reçoit `<testID>-<clé>`. */
  testID?: string;
}) {
  const shadow = useShadows();
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
            bg={selected ? 'raised' : 'transparent'}
            style={selected ? { boxShadow: shadow.sm } : undefined}
            transition="fast"
            onPress={() => {
              if (!selected) {
                haptic.select();
                onChange(o.key);
              }
            }}
            accessible
            tabIndex={0}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            testID={testID ? `${testID}-${o.key}` : undefined}
          >
            <Text
              fontSize={15}
              fontWeight={selected ? '600' : '500'}
              color={selected ? (onGlass ? 'primaryText' : 'color') : onGlass ? 'onGlassMuted' : 'colorMuted'}
            >
              {o.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
