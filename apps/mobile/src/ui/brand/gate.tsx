import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { at } from './splash-geometry';
import mark from './sluis-mark.json';

const { colors } = mark;

export function Gate({ index, open }: { index: number; open: SharedValue<number> }) {
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
