import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

const quiet = (promise: Promise<void>) => {
  promise.catch(() => undefined);
};

export const haptic = {
  select: () => quiet(Haptics.selectionAsync()),
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export const easeOut = Easing.out(Easing.cubic);

export const layoutEase = LinearTransition.duration(200).easing(easeOut);

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

export function Reveal({ children }: { children: ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
      {children}
    </Animated.View>
  );
}

export function Settle({ children }: { children: ReactNode }) {
  return <Animated.View layout={layoutEase}>{children}</Animated.View>;
}
