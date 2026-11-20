import { XStack, YStack } from 'tamagui';
import { BRAND_ICONS } from '@/features/subscriptions/brand-icons';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { RADIUS } from '@/theme/elevation';
import { haptic } from '@/ui/motion/haptics';

/** Grille des logos connus, précédée de l'initiale du nom (`null`). */
export function LogoOptions({
  name,
  selected,
  onSelect,
}: {
  name: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  return (
    <XStack gap="3" flexWrap="wrap" justify="center" pb="2">
      {[null, ...Object.keys(BRAND_ICONS)].map((key) => (
        <YStack
          key={key ?? 'initiale'}
          p="1"
          rounded={RADIUS.control + 4}
          borderWidth={2}
          borderColor={selected === key ? 'primary' : 'surface'}
          scale="1 press:0.985"
          transition="fast"
          onPress={() => {
            haptic.select();
            onSelect(key);
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === key }}
          accessibilityLabel={key ? BRAND_ICONS[key]?.title : 'Initiale du nom'}
        >
          <SubscriptionAvatar name={name || '?'} iconKey={key} size={48} />
        </YStack>
      ))}
    </XStack>
  );
}
