import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

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
