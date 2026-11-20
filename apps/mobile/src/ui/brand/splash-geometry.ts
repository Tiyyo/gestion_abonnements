import mark from './sluis-mark.json';

export const MARK_WIDTH = 220;
const NATIVE_SPLASH_WIDTH = 288;
export const K = MARK_WIDTH / mark.box.w;
export const START_SCALE = (NATIVE_SPLASH_WIDTH * mark.box.w) / 1024 / MARK_WIDTH;
export const MIN_DURATION = 1900;
export const EXIT_DURATION = 380;
const { wave } = mark;
export const WAVELENGTH = wave.half * 2;
export const WAVE_BAND = wave.amplitude + wave.width;

export function wavePath(y: number, from: number, to: number) {
  const steps = Math.round((to - from) / wave.half);
  return `M${from} ${y} q${wave.half / 2} ${-wave.amplitude} ${wave.half} 0` + ` t${wave.half} 0`.repeat(steps - 1);
}

/** Position absolue (en points écran) d'un rectangle exprimé dans le repère de la marque. */
export const at = (x: number, y: number, w: number, h: number) => ({
  position: 'absolute' as const,
  left: (x - mark.box.x) * K,
  top: (y - mark.box.y) * K,
  width: w * K,
  height: h * K,
});
