import { RotateCw } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { haptic } from '@/ui/motion/haptics';
import { Caption } from '@/ui/text/typography';

/** Pastille « mis à jour à … » qui relance la lecture des soldes. */
export function RefreshChip({
  status,
  busy,
  accessibilityLabel,
  onRefresh,
}: {
  status: string;
  busy: boolean;
  accessibilityLabel: string;
  onRefresh: () => void;
}) {
  const colors = useColors();
  return (
    <XStack
      minH={44}
      items="center"
      onPress={() => {
        haptic.select();
        onRefresh();
      }}
      opacity="1 press:0.6"
      transition="fast"
      accessible
      tabIndex={0}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy }}
      // Annonce « actualisation en cours » puis la nouvelle heure, sans déplacer le focus.
      accessibilityLiveRegion="polite"
    >
      <XStack items="center" gap="1.5" px="2.5" py="1" rounded={99} bg="glassFill" borderWidth={1} borderColor="glassEdge">
        <RotateCw color={colors.onGlassMuted} size={12} />
        <Caption fontSize={12} color="onGlass">
          {status}
        </Caption>
      </XStack>
    </XStack>
  );
}
