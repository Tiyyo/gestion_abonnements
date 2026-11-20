import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { HERO_OVERLAP, TOP_GAP } from '@/theme/layout';
import { Skeleton } from '@/ui/feedback/skeleton';
import { SkeletonGroup } from '@/ui/feedback/skeleton-group';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { useDelayedFlag } from '@/ui/hooks/use-delayed-flag';
import { HeroStatusBar } from '@/ui/navigation/hero-status-bar';
import { StackHeader } from '@/ui/navigation/stack-header';
import { Card } from '@/ui/surfaces/card';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { Hero } from '@/ui/surfaces/hero';
import { KeyValueSkeleton } from '@/ui/surfaces/key-value-skeleton';
import { Caption, CardTitle, Display, Overline } from '@/ui/text/typography';

/** Carte en verre de l'en-tête : avatar, nom, catégorie, grand montant et rythme. */
function HeroCardSkeleton({ visible }: { visible: boolean }) {
  return (
    <GlassCard>
      <XStack gap="3" items="center">
        {visible ? <Skeleton tone="glass" w={52} h={52} radius={26} /> : <YStack w={52} h={52} />}
        <YStack flex={1} gap="0.5">
          <SkeletonLine tone="glass" w="60%" visible={visible}>
            <CardTitle>0</CardTitle>
          </SkeletonLine>
          <SkeletonLine tone="glass" w="35%" visible={visible}>
            <Caption>0</Caption>
          </SkeletonLine>
        </YStack>
      </XStack>
      <YStack>
        <SkeletonLine tone="glass" w={150} radius={10} visible={visible}>
          <Display>0</Display>
        </SkeletonLine>
        <SkeletonLine tone="glass" w={70} visible={visible}>
          <Caption>0</Caption>
        </SkeletonLine>
      </YStack>
    </GlassCard>
  );
}

/**
 * Fiche en cours de chargement : le dégradé et le bouton de retour tout de suite, les blocs fantômes (carte en verre,
 * carte « Détails ») si l'attente dépasse 150 ms.
 */
export function DetailSkeleton() {
  const insets = useSafeAreaInsets();
  const visible = useDelayedFlag(true);
  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={false} />
      <SkeletonGroup flex={1}>
        <Hero pt={insets.top + TOP_GAP.stack} pb={HERO_OVERLAP + 20} gap="4">
          <StackHeader onHero />
          <YStack px="4">
            <HeroCardSkeleton visible={visible} />
          </YStack>
        </Hero>
        {visible ? (
          <YStack px="4" gap="2" mt={-HERO_OVERLAP}>
            <Overline px="1" color="onGlassMuted">
              Détails
            </Overline>
            <Card py="0" gap="0" lift>
              <KeyValueSkeleton labelW="40%" valueW={110} />
              <KeyValueSkeleton labelW="50%" valueW={90} />
              <KeyValueSkeleton labelW="45%" valueW={120} last />
            </Card>
          </YStack>
        ) : null}
      </SkeletonGroup>
    </YStack>
  );
}
