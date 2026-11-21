import { type ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/elevation';
import { CLOSE, geometry, OPEN, OPEN_DELAY } from './iris-motion';
import { PILL_HEIGHT, PILL_RADIUS } from './tab-bar-metrics';

export function IrisPill({ active, left, width, children }: { active: boolean; left: number; width: number; children: ReactNode }) {
  const open = useSharedValue(active ? 1 : 0);
  const opening = useSharedValue(active ? 1 : 0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    opening.value = active ? 1 : 0;
    open.value = active ? withDelay(OPEN_DELAY, withTiming(1, OPEN)) : withTiming(0, CLOSE);
  }, [active, open, opening]);

  // Largeur et rayon (propriétés de mise en page) séparés des transformations : Reanimated n'envoie un style que s'il a changé,
  // donc pendant l'ouverture (largeur et rayon constants) seules les transformations passent, sans recalcul de layout.
  const outline = useAnimatedStyle(() => {
    const g = geometry(open.value, opening.value === 1, width);
    return { width: g.w, borderRadius: g.radius };
  });
  const motion = useAnimatedStyle(() => {
    const g = geometry(open.value, opening.value === 1, width);
    return { opacity: open.value > 0.001 ? 1 : 0, transform: [{ scale: g.scale }, { rotate: `${g.angle}deg` }] };
  });
  // Le contenu blanc subit la transformation inverse : il reste droit et à sa taille, seule la fenêtre de la capsule change.
  const content = useAnimatedStyle(() => {
    const g = geometry(open.value, opening.value === 1, width);
    return { transform: [{ rotate: `${-g.angle}deg` }, { scale: 1 / Math.max(g.scale, 0.01) }] };
  });
  // L'ombre ne suit pas le mouvement (Android recalculerait son flou à chaque image) : elle apparaît à l'arrivée.
  const glow = useAnimatedStyle(() => ({
    opacity: opening.value === 1 ? interpolate(open.value, [0.9, 1], [0, 1], Extrapolation.CLAMP) : 0,
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.pillSlot, { left, width }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View style={[styles.pillGlow, { width }, glow]} />
      <Animated.View style={[styles.pill, outline, motion]} />
      <Animated.View style={[styles.pillClip, outline, motion]}>
        <Animated.View style={[{ width, height: PILL_HEIGHT }, content]}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillSlot: { position: 'absolute', height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pill: { height: PILL_HEIGHT, backgroundColor: colors.primary },
  pillGlow: {
    position: 'absolute',
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: colors.primary,
    boxShadow: shadow.glow,
  },
  // Calque jumeau sans ombre qui découpe le contenu blanc (overflow + rayon) : l'ombre de `pill` n'est pas rognée.
  pillClip: { position: 'absolute', height: PILL_HEIGHT, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
