import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useCallback, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, type YStackProps } from 'tamagui';
import { colors } from './kit';

// Fond aubergine des en-têtes : dégradé + lueur pêche (haut droite) + lueur violette (bas gauche), en `backgroundImage` natif (RN 0.88).
// Intensités mesurées : le blanc reste au-dessus de 5:1 sous la lueur pêche, même à travers un bouton en verre.
const WARM = 'rgba(246, 213, 196, 0.30)';
const WARM_CLEAR = 'rgba(246, 213, 196, 0)';
const COOL = 'rgba(156, 72, 160, 0.40)';
const COOL_CLEAR = 'rgba(156, 72, 160, 0)';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.heroTo,
    backgroundImage: [
      `radial-gradient(120% 70% at 100% 0%, ${WARM} 0%, ${WARM_CLEAR} 55%)`,
      `radial-gradient(90% 60% at 0% 100%, ${COOL} 0%, ${COOL_CLEAR} 60%)`,
      `linear-gradient(160deg, ${colors.heroFrom} 0%, ${colors.heroTo} 100%)`,
    ].join(', '),
  },
});

export function Hero({ children, ...props }: YStackProps & { children: ReactNode }) {
  return (
    <YStack position="relative" overflow="hidden" {...props}>
      <View style={styles.backdrop} pointerEvents="none" />
      {children}
    </YStack>
  );
}

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

export function HeroStatusBar({ past, active = true }: { past: boolean; active?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      {active ? <StatusBar style={past ? 'dark' : 'light'} /> : null}
      <YStack
        position="absolute"
        t={0}
        l={0}
        r={0}
        h={insets.top}
        z={10}
        bg="background"
        opacity={past ? 0.94 : 0}
        transition="fast"
        pointerEvents="none"
      />
    </>
  );
}
