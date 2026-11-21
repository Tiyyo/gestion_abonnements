import { XStack, YStack } from 'tamagui';
import { INITIAL_ICON_KEY, resolveIconKey } from '@/features/enrich/brands';
import { BRAND_ICONS } from '@/features/subscriptions/brand-icons';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { RADIUS } from '@/theme/elevation';
import { haptic } from '@/ui/motion/haptics';

/**
 * Grille des logos connus, précédée de l'initiale du nom. Le logo coché est celui affiché (enregistré, ou déduit
 * du nom) ; choisir l'initiale enregistre `INITIAL_ICON_KEY`, pour qu'un nom de marque ne ramène pas son logo.
 */
export function LogoOptions({
  name,
  selected,
  onSelect,
}: {
  name: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const shown = resolveIconKey(name, selected) ?? INITIAL_ICON_KEY;
  return (
    <XStack gap="3" flexWrap="wrap" justify="center" pb="2">
      {[INITIAL_ICON_KEY, ...Object.keys(BRAND_ICONS)].map((key) => (
        <YStack
          key={key}
          p="1"
          rounded={RADIUS.control + 4}
          borderWidth={2}
          borderColor={shown === key ? 'primaryText' : 'surface'}
          scale="1 press:0.985"
          transition="fast"
          onPress={() => {
            haptic.select();
            onSelect(key);
          }}
          accessible
          tabIndex={0}
          accessibilityRole="radio"
          accessibilityState={{ checked: shown === key }}
          accessibilityLabel={BRAND_ICONS[key]?.title ?? 'Initiale du nom'}
        >
          <SubscriptionAvatar name={name || '?'} iconKey={key} size={48} />
        </YStack>
      ))}
    </XStack>
  );
}
