import { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Défilement au-delà duquel le dégradé a quitté la barre d'état. */
const PAST_HERO = 96;

/**
 * Barre d'état d'un écran à Hero qui défile : icônes claires sur le dégradé ; une fois le dégradé passé, bandeau
 * du fond de l'app sous la barre et icônes sombres (sinon les icônes blanches disparaissent sur le fond clair).
 * Brancher `onScroll` sur le ScrollView (avec `scrollEventThrottle={16}`).
 */
export function useHeroStatusBar() {
  const [past, setPast] = useState(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > PAST_HERO;
    setPast((prev) => (prev === next ? prev : next));
  }, []);
  return { past, onScroll };
}
