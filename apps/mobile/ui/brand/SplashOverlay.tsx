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
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import mark from './sluis-mark.json';

const MARK_WIDTH = 220;
const NATIVE_SPLASH_WIDTH = 288;
const K = MARK_WIDTH / mark.box.w;
const START_SCALE = (NATIVE_SPLASH_WIDTH * mark.box.w) / 1024 / MARK_WIDTH;
const MIN_DURATION = 1900;
const EXIT_DURATION = 380;
const { wave, colors } = mark;
const WAVELENGTH = wave.half * 2;
const WAVE_BAND = wave.amplitude + wave.width;

function wavePath(y: number, from: number, to: number) {
  const steps = Math.round((to - from) / wave.half);
  return `M${from} ${y} q${wave.half / 2} ${-wave.amplitude} ${wave.half} 0` + ` t${wave.half} 0`.repeat(steps - 1);
}

const at = (x: number, y: number, w: number, h: number) => ({
  position: 'absolute' as const,
  left: (x - mark.box.x) * K,
  top: (y - mark.box.y) * K,
  width: w * K,
  height: h * K,
});

function Gate({ index, open }: { index: number; open: SharedValue<number> }) {
  const g = mark.gates[index];
  const side = index === 0 ? -1 : 1;
  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${side * 72 * open.value}deg` }],
  }));
  return (
    <Animated.View style={[at(g.x, g.y, g.w, g.h), { transformOrigin: index === 0 ? 'left' : 'right' }, style]}>
      <Svg width="100%" height="100%" viewBox={`${g.x} ${g.y} ${g.w} ${g.h}`}>
        <Rect x={g.x} y={g.y} width={g.w} height={g.h} rx={mark.radius} fill={colors.gate} />
        <Path d={g.brace} stroke={colors.bg} strokeWidth={mark.braceWidth} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Wave({ index, flow }: { index: number; flow: SharedValue<number> }) {
  const w = mark.waves[index];
  const from = wave.from - WAVELENGTH;
  const top = w.y - WAVE_BAND / 2;
  const width = wave.to - from + wave.width;
  const speed = index === 0 ? 1 : 0.6;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: ((flow.value * speed) % 1) * WAVELENGTH * K }],
  }));
  return (
    <View style={[at(mark.box.x, top, mark.box.w, WAVE_BAND), styles.clip]}>
      <Animated.View
        style={[{ position: 'absolute', left: (from - wave.width / 2 - mark.box.x) * K, width: width * K, height: WAVE_BAND * K }, style]}
      >
        <Svg width="100%" height="100%" viewBox={`${from - wave.width / 2} ${top} ${width} ${WAVE_BAND}`}>
          <Path
            d={wavePath(w.y, from, wave.to)}
            fill="none"
            stroke={colors[w.color as 'water' | 'waterBack']}
            strokeOpacity={w.opacity}
            strokeWidth={wave.width}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

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
  clip: { overflow: 'hidden' },
  word: { position: 'absolute', top: '50%', marginTop: (mark.box.h * K) / 2 + 36 },
  wordText: { color: '#FFFFFF', fontSize: 46, fontWeight: '800', letterSpacing: -0.5 },
});
