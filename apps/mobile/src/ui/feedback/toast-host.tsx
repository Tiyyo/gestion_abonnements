import { useEffect, useReducer, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardTop } from '@/ui/hooks/use-keyboard-top';
import { easeOut } from '@/ui/motion/easing';
import { haptic } from '@/ui/motion/haptics';
import { BAR_GAP, BAR_HEIGHT } from '@/ui/navigation/tab-bar/tab-bar-metrics';
import { registerToastHost } from './show-toast';
import { toastBottom, toastDuration, toastReducer } from './toast-logic';
import { ToastView } from './toast-view';

// Au-dessus de la barre d'onglets flottante ; la même hauteur dégage aussi le pied des feuilles (bouton + marges = 88).
const RESTING_GAP = BAR_GAP + BAR_HEIGHT + 12;
const SHIFT = 8;

/** Hôte unique des messages `showToast`, monté une fois dans `AppShell` au-dessus des écrans. */
export function ToastHost() {
  const [current, dispatch] = useReducer(toastReducer, null);
  const [hostHeight, setHostHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const keyboardTop = useKeyboardTop();

  useEffect(() => registerToastHost({ show: (toast) => dispatch({ type: 'show', toast }), hide: () => dispatch({ type: 'clear' }) }), []);

  useEffect(() => {
    if (!current) {
      return;
    }
    if (current.tone === 'ok') {
      haptic.success();
    } else {
      haptic.select();
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled()
      .catch(() => false)
      .then((screenReader) => {
        if (!cancelled) {
          timer = setTimeout(() => dispatch({ type: 'dismiss', id: current.id }), toastDuration(current, screenReader));
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [current]);

  const bottom = toastBottom({ hostHeight, keyboardTop, restingOffset: insets.bottom + RESTING_GAP });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={(e) => setHostHeight(e.nativeEvent.layout.height)}>
      {current ? (
        <Animated.View
          key={current.id}
          style={[styles.slot, { bottom }]}
          pointerEvents="box-none"
          entering={FadeInDown.duration(200)
            .easing(easeOut)
            .withInitialValues({ opacity: 0, transform: [{ translateY: SHIFT }] })}
          exiting={FadeOut.duration(140)}
        >
          <ToastView
            toast={current}
            onAction={() => {
              haptic.tap();
              dispatch({ type: 'dismiss', id: current.id });
              current.action?.onPress();
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 16, right: 16 },
});
