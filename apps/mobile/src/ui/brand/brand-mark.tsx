import Svg, { Path, Rect } from 'react-native-svg';
import { colorSets } from '@/theme/colors';
import mark from './sluis-mark.json';
import { wavePath } from './splash-geometry';

const { box, walkway, wave, colors } = mark;

/**
 * Marque Sluis immobile (portes d'écluse, passerelle, vagues), même géométrie que l'écran de démarrage.
 * `cutout` : couleur des écharpes des portes, à accorder au fond (par défaut le haut du dégradé du Hero, identique dans les deux thèmes).
 */
export function BrandMark({ size = 72, cutout = colorSets.light.heroFrom }: { size?: number; cutout?: string }) {
  return (
    <Svg
      width={size}
      height={(size * box.h) / box.w}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Rect x={walkway.x} y={walkway.y} width={walkway.w} height={walkway.h} rx={walkway.h / 2} fill={colors.gate} />
      {mark.gates.map((g) => (
        <Rect key={g.x} x={g.x} y={g.y} width={g.w} height={g.h} rx={mark.radius} fill={colors.gate} />
      ))}
      {mark.gates.map((g) => (
        <Path key={g.brace} d={g.brace} stroke={cutout} strokeWidth={mark.braceWidth} strokeLinecap="round" />
      ))}
      {mark.waves.map((w) => (
        <Path
          key={w.y}
          d={wavePath(w.y, wave.from, wave.to)}
          fill="none"
          stroke={colors[w.color as 'water' | 'waterBack']}
          strokeOpacity={w.opacity}
          strokeWidth={wave.width}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
