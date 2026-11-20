import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOP_GAP } from '@/theme/layout';
import { IconButton } from '@/ui/controls/icon-button';
import { ScreenHeader } from '@/ui/navigation/screen-header';
import { Hero } from '@/ui/surfaces/hero';

export function SubscriptionsHero({ count }: { count: number }) {
  const insets = useSafeAreaInsets();
  return (
    <Hero pt={insets.top + TOP_GAP.tab} pb="4">
      <ScreenHeader
        onHero
        overline={`${count} abonnement${count > 1 ? 's' : ''} en cours`}
        title="Abonnements"
        trailing={
          <IconButton icon={Plus} label="Ajouter un abonnement" variant="glass" onPress={() => router.push('/subscriptions/new')} />
        }
      />
    </Hero>
  );
}
