import { router } from 'expo-router';
import { ChartColumn } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { BalancesCard } from '@/features/balances/components/balances-card';
import { HERO_OVERLAP } from '@/features/home/constants';
import { heroDateLabel } from '@/features/home/home-wording';
import { TOP_GAP } from '@/theme/layout';
import { IconButton } from '@/ui/controls/icon-button';
import { ScreenHeader } from '@/ui/navigation/screen-header';
import { Hero } from '@/ui/surfaces/hero';

/** En-tête sur dégradé : date du jour, accès aux statistiques et soldes Revolut (masqués tant qu'il n'y a aucun abonnement). */
export function HomeHero({
  today,
  showBalances,
  pendingTransfersCents,
}: {
  today: string;
  showBalances: boolean;
  pendingTransfersCents: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Hero pt={insets.top + TOP_GAP.tab} pb={HERO_OVERLAP + 20} gap="4">
      <ScreenHeader
        onHero
        overline={heroDateLabel(today)}
        title="À venir"
        trailing={<IconButton icon={ChartColumn} label="Ouvrir les statistiques" variant="glass" onPress={() => router.push('/stats')} />}
      />
      {showBalances ? (
        <YStack px="4">
          <BalancesCard pendingTransfersCents={pendingTransfersCents} />
        </YStack>
      ) : null}
    </Hero>
  );
}
