import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import { layoutEase } from './easing';

export function Settle({ children }: { children: ReactNode }) {
  return <Animated.View layout={layoutEase}>{children}</Animated.View>;
}
