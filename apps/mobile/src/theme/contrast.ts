type Rgba = readonly [number, number, number, number];

/** Lit `#RRGGBB` ou `rgb()/rgba()` (les seules formes utilisées par la palette). */
export function parseColor(color: string): Rgba {
  if (color.startsWith('#')) {
    const channel = (i: number) => parseInt(color.slice(i, i + 2), 16);
    return [channel(1), channel(3), channel(5), 1];
  }
  const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
  return [r, g, b, a];
}

/** Couleur opaque obtenue en posant `front` (éventuellement translucide) sur `back`. */
export function composite(front: string, back: string): string {
  const [r, g, b, a] = parseColor(front);
  const [br, bg, bb] = parseColor(back);
  const mix = (f: number, k: number) => Math.round(f * a + k * (1 - a));
  return `rgb(${mix(r, br)}, ${mix(g, bg)}, ${mix(b, bb)})`;
}

export function luminance(color: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseColor(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste WCAG entre un premier plan (translucide accepté) et un fond opaque. */
export function contrastRatio(front: string, back: string): number {
  const a = luminance(composite(front, back));
  const b = luminance(back);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** `#RRGGBB` → `rgba(r, g, b, alpha)`. */
export function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
