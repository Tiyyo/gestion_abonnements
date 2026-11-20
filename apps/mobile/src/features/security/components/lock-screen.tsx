import { StatusBar } from 'expo-status-bar';
import { Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { BrandMark } from '@/ui/brand/brand-mark';
import { ActionButton } from '@/ui/controls/action-button';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { Hero } from '@/ui/surfaces/hero';
import { Body, ScreenTitle } from '@/ui/text/typography';

/** Écran de verrouillage plein écran sur le dégradé : marque, puis panneau en verre avec le bouton de déverrouillage. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Hero flex={1} justify="center" gap="8" px="6" pt={insets.top} pb={insets.bottom}>
      <StatusBar style="light" />
      <YStack items="center" gap="4">
        <BrandMark size={96} />
        <ScreenTitle color="onGlass" accessibilityRole="header">
          Sluis
        </ScreenTitle>
      </YStack>
      <GlassCard gap="4" p="5">
        <XStack gap="2" items="center" justify="center">
          <Lock color={colors.onGlassMuted} size={18} strokeWidth={2} />
          <Body color="onGlass">L’app est verrouillée.</Body>
        </XStack>
        <ActionButton size="lg" label="Déverrouiller" variant="secondary" onPress={onUnlock} testID="lock.unlock" />
      </GlassCard>
    </Hero>
  );
}
