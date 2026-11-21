import type { LucideIcon } from 'lucide-react-native';
import { CalendarCheck, House, List, SlidersHorizontal } from 'lucide-react-native';

/** Onglets de l'app, dans l'ordre de la barre : nom de la route (dans `app/(tabs)`), titre, icône lucide et sélecteur de test. */
export const TABS: readonly { name: string; title: string; icon: LucideIcon; testID: string }[] = [
  { name: 'index', title: 'Accueil', icon: House, testID: 'tab.accueil' },
  { name: 'plan', title: 'Plan', icon: CalendarCheck, testID: 'tab.plan' },
  { name: 'abonnements', title: 'Abonnements', icon: List, testID: 'tab.abonnements' },
  { name: 'reglages', title: 'Réglages', icon: SlidersHorizontal, testID: 'tab.reglages' },
];
