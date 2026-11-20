import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { at, K, WAVE_BAND, WAVELENGTH, wavePath } from './splash-geometry';
import mark from './sluis-mark.json';

const { wave, colors } = mark;

export function Wave({ index, flow }: { index: number; flow: SharedValue<number> }) {
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

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
