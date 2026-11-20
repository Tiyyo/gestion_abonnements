import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';

export type SkeletonTone = 'light' | 'glass';

const TONES: Record<SkeletonTone, string> = { light: colors.subtle, glass: colors.glassSkeleton };

// Un cycle complet (aller-retour) dure 1,2 s, sans ressort.
const HALF_CYCLE_MS = 600;
const DIM_OPACITY = 0.45;

interface Props {
  w?: DimensionValue;
  h?: DimensionValue;
  radius?: number;
  /** `light` sur une surface claire, `glass` sur le verre du Hero. */
  tone?: SkeletonTone;
  style?: StyleProp<ViewStyle>;
}

/** Bloc fantôme d'un contenu en cours de chargement : pulsation d'opacité discrète, fixe si les animations sont réduites. */
export function Skeleton({ w, h, radius = 6, tone = 'light', style }: Props) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    opacity.value = withRepeat(withTiming(DIM_OPACITY, { duration: HALF_CYCLE_MS, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: w, height: h, borderRadius: radius, backgroundColor: TONES[tone] }, style, pulse]}
    />
  );
}
