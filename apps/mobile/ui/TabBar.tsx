import { BlurView, type BlurMethod } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { type ComponentRef, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { elevated, RADIUS, shadow } from './elevation';
import { colors } from './kit';
import { easeOut } from './motion';

// Flou réel sous Android : la bibliothèque Dimezis redessine la cible à chaque image.
// Sur Android 11 (SDK 30), elle coûte du GPU : passer à 'none' si le défilement saccade (la teinte barFill reste lisible seule).
const ANDROID_BLUR: BlurMethod = 'dimezisBlurView';

const BAR_HEIGHT = 64;
const BAR_GAP = 12;

/** Espace à réserver en bas d'un écran d'onglet pour que la barre flottante ne masque rien (ajouter `insets.bottom`). */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_GAP + 16;

/**
 * Le navigateur appelle `tabBar` à l'intérieur de la scène : on remonte ses props pour dessiner la barre hors de la cible floutée.
 * `state` est un nouvel objet à chaque rendu du navigateur : on ne remonte que si l'onglet actif ou la liste des onglets change,
 * sinon setState → rendu du layout → rendu du navigateur → nouveau `state` → boucle infinie.
 */
export function TabBarBridge({ onProps, ...props }: BottomTabBarProps & { onProps: (props: BottomTabBarProps) => void }) {
  const signature = `${props.state.index}:${props.state.routes.map((r) => r.key).join(',')}`;
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    onProps(latest.current);
  }, [signature, onProps]);
  return null;
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

const ROW_PADDING = 6;
const ROW_GAP = 4;
const PILL_HEIGHT = BAR_HEIGHT - 14;
const PILL_RADIUS = RADIUS.control + 2;

// Effet « iris » (porte des étoiles) : la capsule quittée pivote et se resserre en cercle, puis se referme en un point ;
// la capsule visée naît minuscule (mêmes proportions) et grandit d'un seul geste en pivotant jusqu'à sa forme finale.
// Courbes en `timing` sans rebond (règle du projet) ; Reanimated les saute si l'option système « supprimer les animations » est active.
const CLOSE = { duration: 260, easing: Easing.in(Easing.cubic) } as const;
const OPEN = { duration: 420, easing: Easing.bezier(0.2, 0, 0, 1) } as const;
const OPEN_FROM_SCALE = 0.12;
const OPEN_DELAY = 110;
const TWIST_DEG = 90;

function TabContent({ icon, label, color }: { icon: ReactNode; label: string; color: 'onPrimary' | 'colorMuted' }) {
  return (
    <YStack flex={1} h={PILL_HEIGHT} items="center" justify="center" gap="0.5" pointerEvents="none">
      {icon}
      <Text fontSize={11} fontWeight="600" color={color} numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}

function IrisPill({ active, left, width, children }: { active: boolean; left: number; width: number; children: ReactNode }) {
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

  // Géométrie de la capsule à l'instant v : échelle, rotation, largeur et rayon.
  const geometry = (v: number, isOpening: boolean) => {
    'worklet';
    if (isOpening) {
      // Ouverture : une capsule minuscule qui grandit et se redresse d'un seul mouvement.
      return { scale: OPEN_FROM_SCALE + (1 - OPEN_FROM_SCALE) * v, angle: -TWIST_DEG * (1 - v), w: width, radius: PILL_RADIUS };
    }
    // Fermeture : la capsule se resserre en cercle (première moitié), puis le cercle se referme en un point.
    const widen = Math.max((v - 0.5) / 0.5, 0);
    return {
      scale: Math.min(v / 0.5, 1),
      angle: -TWIST_DEG * (1 - v),
      w: PILL_HEIGHT + (width - PILL_HEIGHT) * widen,
      radius: PILL_HEIGHT / 2 + (PILL_RADIUS - PILL_HEIGHT / 2) * widen,
    };
  };

  // Largeur et rayon (propriétés de mise en page) séparés des transformations : Reanimated n'envoie un style que s'il a changé,
  // donc pendant l'ouverture (largeur et rayon constants) seules les transformations passent, sans recalcul de layout.
  const outline = useAnimatedStyle(() => {
    const g = geometry(open.value, opening.value === 1);
    return { width: g.w, borderRadius: g.radius };
  });
  const motion = useAnimatedStyle(() => {
    const g = geometry(open.value, opening.value === 1);
    return { opacity: open.value > 0.001 ? 1 : 0, transform: [{ scale: g.scale }, { rotate: `${g.angle}deg` }] };
  });
  // Le contenu blanc subit la transformation inverse : il reste droit et à sa taille, seule la fenêtre de la capsule change.
  const content = useAnimatedStyle(() => {
    const g = geometry(open.value, opening.value === 1);
    return { transform: [{ rotate: `${-g.angle}deg` }, { scale: 1 / Math.max(g.scale, 0.01) }] };
  });
  // L'ombre ne suit pas le mouvement (Android recalculerait son flou à chaque image) : elle apparaît à l'arrivée.
  const glow = useAnimatedStyle(() => ({
    opacity: opening.value === 1 ? interpolate(open.value, [0.9, 1], [0, 1], Extrapolation.CLAMP) : 0,
  }));

  return (
    <View pointerEvents="none" style={[styles.pillSlot, { left, width }]}>
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

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  blurTarget,
}: BottomTabBarProps & { blurTarget: RefObject<ComponentRef<typeof View> | null> }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [rowWidth, setRowWidth] = useState(0);
  const count = state.routes.length;
  const slot = rowWidth > 0 ? (rowWidth - ROW_PADDING * 2 - ROW_GAP * (count - 1)) / count : 0;
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (__DEV__ && reduceMotion) {
      console.warn('Animations réduites par le système : la capsule de la barre d’onglets change sans animation.');
    }
  }, [reduceMotion]);

  // L'iris démarre dès le toucher ; l'état du navigateur reprend la main ensuite (retour arrière, notification…).
  const [active, setActive] = useState(state.index);
  useEffect(() => {
    setActive(state.index);
  }, [state.index]);

  if (keyboardVisible) {
    return null;
  }

  const tabs = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    return { route, index, options, label: options.title ?? route.name };
  });

  return (
    <YStack
      position="absolute"
      l={14}
      r={14}
      b={insets.bottom + BAR_GAP}
      h={BAR_HEIGHT}
      rounded={RADIUS.glass}
      style={elevated('bar')}
      pointerEvents="box-none"
    >
      <YStack flex={1} rounded={RADIUS.glass} overflow="hidden" borderWidth={1} borderColor="barEdge">
        <BlurView style={StyleSheet.absoluteFill} tint="light" intensity={60} blurMethod={ANDROID_BLUR} blurTarget={blurTarget} />
        <XStack
          flex={1}
          bg="barFill"
          px={ROW_PADDING}
          items="center"
          gap={ROW_GAP}
          role="tablist"
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        >
          {tabs.map(({ route, options, label }) => (
            <TabContent
              key={route.key}
              label={label}
              color="colorMuted"
              icon={options.tabBarIcon?.({ focused: false, color: colors.muted, size: 22 })}
            />
          ))}

          {slot > 0
            ? tabs.map(({ route, index, options, label }) => (
                <IrisPill key={route.key} active={index === active} left={ROW_PADDING + index * (slot + ROW_GAP)} width={slot}>
                  <TabContent
                    label={label}
                    color="onPrimary"
                    icon={options.tabBarIcon?.({ focused: true, color: colors.onPrimary, size: 22 })}
                  />
                </IrisPill>
              ))
            : null}

          <XStack position="absolute" t={0} b={0} l={ROW_PADDING} r={ROW_PADDING} gap={ROW_GAP} items="center">
            {tabs.map(({ route, index, options, label }) => {
              const focused = index === state.index;
              return (
                <YStack
                  key={route.key}
                  flex={1}
                  h={PILL_HEIGHT}
                  rounded={PILL_RADIUS}
                  onPress={() => {
                    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) {
                      setActive(index);
                      navigateToTab(route.key);
                    }
                  }}
                  onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                />
              );
            })}
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
