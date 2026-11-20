import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { TOP_GAP } from '@/theme/layout';
import { GlassSearchField } from '@/ui/controls/glass-search-field';
import { IconButton } from '@/ui/controls/icon-button';
import { ScreenHeader } from '@/ui/navigation/screen-header';
import { Hero } from '@/ui/surfaces/hero';

interface Props {
  count: number;
  /** Recherche sous le titre ; absente tant qu'il y a trop peu d'abonnements. */
  search?: { value: string; onChange: (value: string) => void };
}

export function SubscriptionsHero({ count, search }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Hero pt={insets.top + TOP_GAP.tab} pb="4" gap="4">
      <ScreenHeader
        onHero
        overline={`${count} abonnement${count > 1 ? 's' : ''} en cours`}
        title="Abonnements"
        trailing={
          <IconButton icon={Plus} label="Ajouter un abonnement" variant="glass" onPress={() => router.push('/subscriptions/new')} />
        }
      />
      {search ? (
        <YStack px="4">
          <GlassSearchField value={search.value} onChangeText={search.onChange} placeholder="Rechercher un abonnement" />
        </YStack>
      ) : null}
    </Hero>
  );
}
