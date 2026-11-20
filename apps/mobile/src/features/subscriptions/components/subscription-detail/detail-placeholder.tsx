import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { TOP_GAP } from '@/theme/layout';
import { ActionButton } from '@/ui/controls/action-button';
import { EmptyState } from '@/ui/feedback/empty-state';
import { HeroStatusBar } from '@/ui/navigation/hero-status-bar';
import { StackHeader } from '@/ui/navigation/stack-header';
import { Hero } from '@/ui/surfaces/hero';

/** Abonnement introuvable (supprimé entre-temps). L'en-tête garde le bouton de retour ; le chargement est `DetailSkeleton`. */
export function DetailPlaceholder() {
  const insets = useSafeAreaInsets();
  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={false} />
      <Hero pt={insets.top + TOP_GAP.stack} pb="5">
        <StackHeader onHero title="Abonnement" />
      </Hero>
      <EmptyState
        message="Cet abonnement est introuvable. Il a peut-être été supprimé."
        action={<ActionButton label="Revenir en arrière" variant="outline" onPress={() => router.back()} />}
      />
    </YStack>
  );
}
