import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Gate } from './gate';
import mark from './sluis-mark.json';
import { at, EXIT_DURATION, K, MARK_WIDTH, MIN_DURATION, START_SCALE } from './splash-geometry';
import { Wave } from './wave';

const { colors } = mark;

export function SplashOverlay({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : START_SCALE);
  const open = useSharedValue(0);
  const flow = useSharedValue(0);
  const word = useSharedValue(0);
  const fade = useSharedValue(1);
  const [minElapsed, setMinElapsed] = useState(false);
  const started = useRef(false);

  const start = () => {
    if (started.current) {
      return;
    }
    started.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
    if (reduceMotion) {
      word.value = 1;
      setMinElapsed(true);
      return;
    }
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    flow.value = withRepeat(withTiming(10, { duration: 18000, easing: Easing.linear }), -1);
    open.value = withDelay(550, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    word.value = withDelay(950, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    setTimeout(() => setMinElapsed(true), MIN_DURATION);
  };

  useEffect(() => {
    if (!ready || !minElapsed) {
      return;
    }
    fade.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(reduceMotion ? 1 : 1.12, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) });
    const timer = setTimeout(onDone, EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [ready, minElapsed, fade, scale, reduceMotion, onDone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: open.value * 0.22 }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  const walk = mark.walkway;
  const [left, right] = mark.gates;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} onLayout={start} accessibilityLabel="Sluis, chargement">
      <StatusBar style="light" />
      <Animated.View style={[styles.mark, markStyle]}>
        <Animated.View
          style={[
            at(left.x, left.y, right.x + right.w - left.x, left.h),
            { borderRadius: mark.radius * K, backgroundColor: colors.gate },
            glowStyle,
          ]}
        />
        <Gate index={0} open={open} />
        <Gate index={1} open={open} />
        <View style={[at(walk.x, walk.y, walk.w, walk.h), { borderRadius: (walk.h / 2) * K, backgroundColor: colors.gate }]} />
        <Wave index={0} flow={flow} />
        <Wave index={1} flow={flow} />
      </Animated.View>
      <Animated.View style={[styles.word, wordStyle]}>
        <Text style={styles.wordText}>Sluis</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  mark: { width: MARK_WIDTH, height: mark.box.h * K },
  word: { position: 'absolute', top: '50%', marginTop: (mark.box.h * K) / 2 + 36 },
  wordText: { color: '#FFFFFF', fontSize: 46, fontWeight: '800', letterSpacing: -0.5 },
});
