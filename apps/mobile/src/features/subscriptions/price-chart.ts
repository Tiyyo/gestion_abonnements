export interface StepChart {
  /** Tracé SVG en escalier : un palier horizontal par prix, une marche verticale à chaque changement. */
  path: string;
  /** Extrémité droite du dernier palier (prix actuel). */
  end: { x: number; y: number };
}

interface Box {
  width: number;
  height: number;
  /** Marge intérieure, pour que le trait et le point final ne soient pas rognés. */
  pad: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Géométrie du graphique en escalier. Les paliers ont tous la même largeur (l'axe horizontal est l'ordre des
 * changements, pas le temps) ; le prix le plus haut touche le haut, le plus bas le bas. `null` sous 2 paliers.
 */
export function stepChart(levels: readonly number[], { width, height, pad }: Box): StepChart | null {
  if (levels.length < 2 || width <= 2 * pad || height <= 2 * pad) {
    return null;
  }
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const span = max - min;
  const innerHeight = height - 2 * pad;
  const step = (width - 2 * pad) / levels.length;
  const y = (cents: number) => round(span === 0 ? height / 2 : pad + ((max - cents) / span) * innerHeight);

  let path = `M${pad} ${y(levels[0]!)}`;
  levels.forEach((cents, index) => {
    if (index > 0) {
      path += ` V${y(cents)}`;
    }
    path += ` H${round(pad + (index + 1) * step)}`;
  });
  return { path, end: { x: round(width - pad), y: y(levels[levels.length - 1]!) } };
}
