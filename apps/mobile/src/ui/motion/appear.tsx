import type { ReactNode } from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { easeOut, layoutEase } from './easing';

export function Appear({ index = 0, children }: { index?: number; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 25)
        .duration(200)
        .easing(easeOut)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })}
      exiting={FadeOut.duration(140)}
      layout={layoutEase}
    >
      {children}
    </Animated.View>
  );
}
