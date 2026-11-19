import { BlurView, type BlurMethod } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { type ComponentRef, type RefObject, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { elevated, RADIUS, shadow } from './elevation';
import { colors } from './kit';

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

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  blurTarget,
}: BottomTabBarProps & { blurTarget: RefObject<ComponentRef<typeof View> | null> }) {
  const insets = useSafeAreaInsets();
  if (useKeyboardVisible()) {
    return null;
  }
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
        <XStack flex={1} bg="barFill" px="1.5" items="center" gap="1" role="tablist">
          {state.routes.map((route, index) => {
            const focused = index === state.index;
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const color = focused ? colors.onPrimary : colors.muted;
            return (
              <YStack
                key={route.key}
                flex={1}
                h={BAR_HEIGHT - 14}
                items="center"
                justify="center"
                gap="0.5"
                rounded={RADIUS.control + 2}
                bg={focused ? 'primary' : 'transparent'}
                style={focused ? { boxShadow: shadow.glow } : undefined}
                opacity="1 press:0.7"
                scale="1 press:0.985"
                transition="fast"
                onPress={() => {
                  const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    navigateToTab(route.key);
                  }
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              >
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                <Text fontSize={11} fontWeight="600" color={focused ? 'onPrimary' : 'colorMuted'} numberOfLines={1}>
                  {label}
                </Text>
              </YStack>
            );
          })}
        </XStack>
      </YStack>
    </YStack>
  );
}
