import type { ReactNode } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export function Reveal({ children }: { children: ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
      {children}
    </Animated.View>
  );
}
