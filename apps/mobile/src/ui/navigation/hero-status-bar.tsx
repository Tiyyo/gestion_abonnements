import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { AppStatusBar } from './app-status-bar';

/** Icônes claires sur le dégradé ; une fois le dégradé passé (`past`), bandeau du fond de l'app et icônes accordées au thème. */
export function HeroStatusBar({ past, active = true }: { past: boolean; active?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      {active ? <AppStatusBar onDark={!past} /> : null}
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
