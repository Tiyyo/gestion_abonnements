import type { ReactNode } from 'react';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { easeOut } from '@/ui/motion/easing';

/** Entrée du contenu d'un mois : glisse de 10 px dans le sens du changement de mois. Le parent change la `key` à chaque mois. */
export function MonthTransition({ direction, children }: { direction: number; children: ReactNode }) {
  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={(direction > 0 ? FadeInRight : FadeInLeft)
        .duration(180)
        .easing(easeOut)
        .withInitialValues({ opacity: 0, transform: [{ translateX: direction * 10 }] })}
    >
      {children}
    </Animated.View>
  );
}
