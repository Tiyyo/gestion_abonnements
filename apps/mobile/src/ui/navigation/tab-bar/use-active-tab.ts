import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Onglet dont la capsule est ouverte. L'iris démarre dès le toucher (`setActive`) ; l'état du navigateur reprend la main
 * ensuite (retour arrière, notification…) : quand `navigatorIndex` change, il s'impose.
 */
export function useActiveTab(navigatorIndex: number) {
  const [active, setActive] = useState(navigatorIndex);
  const [syncedIndex, setSyncedIndex] = useState(navigatorIndex);
  if (syncedIndex !== navigatorIndex) {
    setSyncedIndex(navigatorIndex);
    setActive(navigatorIndex);
  }

  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (__DEV__ && reduceMotion) {
      console.warn('Animations réduites par le système : la capsule de la barre d’onglets change sans animation.');
    }
  }, [reduceMotion]);

  return [active, setActive] as const;
}
