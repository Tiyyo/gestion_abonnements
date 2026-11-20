import type { LucideIcon } from 'lucide-react-native';
import { CalendarCheck, House, List, SlidersHorizontal } from 'lucide-react-native';

/** Onglets de l'app, dans l'ordre de la barre : nom de la route (dans `app/(tabs)`), titre et icône lucide. */
export const TABS: readonly { name: string; title: string; icon: LucideIcon }[] = [
  { name: 'index', title: 'Accueil', icon: House },
  { name: 'plan', title: 'Plan', icon: CalendarCheck },
  { name: 'abonnements', title: 'Abonnements', icon: List },
  { name: 'reglages', title: 'Réglages', icon: SlidersHorizontal },
];
