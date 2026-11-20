import type { Scheme } from './palette';

// Échelle d'élévation unique : chaque niveau empile un anneau de 1 px, une ombre de contact courte et une ombre longue diffuse.
// React Native 0.88 (New Architecture) lit ces chaînes `boxShadow` telles quelles, couches et `inset` compris.
const light = {
  sm: '0px 0px 0px 1px rgba(20, 24, 27, 0.04), 0px 1px 2px rgba(20, 24, 27, 0.06), 0px 2px 4px rgba(20, 24, 27, 0.04)',
  md: '0px 0px 0px 1px rgba(20, 24, 27, 0.04), 0px 1px 2px rgba(20, 24, 27, 0.05), 0px 6px 14px -6px rgba(20, 24, 27, 0.10)',
  lg: '0px 0px 0px 1px rgba(20, 24, 27, 0.04), 0px 4px 8px -2px rgba(20, 24, 27, 0.08), 0px 18px 36px -10px rgba(76, 30, 79, 0.22)',
  glow: '0px 8px 18px -6px rgba(76, 30, 79, 0.55), inset 0px 1px 0px rgba(255, 255, 255, 0.18)',
  accent:
    '0px 4px 8px -2px rgba(76, 30, 79, 0.20), 0px 18px 36px -10px rgba(76, 30, 79, 0.45), inset 0px 1px 0px rgba(255, 255, 255, 0.14)',
  warn: '0px 0px 0px 1px rgba(122, 62, 0, 0.12), 0px 10px 24px -12px rgba(122, 62, 0, 0.35)',
  danger: '0px 0px 0px 1px rgba(138, 28, 28, 0.12), 0px 10px 24px -12px rgba(138, 28, 28, 0.35)',
  ok: '0px 0px 0px 1px rgba(33, 79, 30, 0.10), 0px 10px 24px -12px rgba(33, 79, 30, 0.25)',
  glass: 'inset 0px 1px 0px rgba(255, 255, 255, 0.25), 0px 16px 40px -12px rgba(15, 4, 16, 0.55)',
  bar: '0px 0px 0px 1px rgba(20, 24, 27, 0.05), 0px 12px 32px -10px rgba(20, 24, 27, 0.30)',
  sheet: '0px -1px 0px rgba(20, 24, 27, 0.04), 0px -8px 32px rgba(20, 24, 27, 0.14)',
} as const;

export type ShadowLevel = keyof typeof light;

// Sombre : une ombre noire ne se voit presque pas sur un fond sombre. Le relief vient de la surface plus claire (palette)
// et d'un liseré clair de 1 px (teinté selon le ton) ; l'ombre portée reste courte.
const dark: Record<ShadowLevel, string> = {
  sm: '0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 1px 2px rgba(0, 0, 0, 0.30)',
  md: '0px 0px 0px 1px rgba(255, 255, 255, 0.07), 0px 2px 6px -2px rgba(0, 0, 0, 0.40)',
  lg: '0px 0px 0px 1px rgba(255, 255, 255, 0.10), 0px 8px 20px -8px rgba(0, 0, 0, 0.55)',
  glow: '0px 6px 16px -6px rgba(160, 85, 165, 0.45), inset 0px 1px 0px rgba(255, 255, 255, 0.16)',
  accent:
    '0px 0px 0px 1px rgba(255, 255, 255, 0.10), 0px 10px 24px -10px rgba(160, 85, 165, 0.40), inset 0px 1px 0px rgba(255, 255, 255, 0.14)',
  warn: '0px 0px 0px 1px rgba(255, 207, 143, 0.18), 0px 2px 6px -2px rgba(0, 0, 0, 0.40)',
  danger: '0px 0px 0px 1px rgba(255, 179, 179, 0.18), 0px 2px 6px -2px rgba(0, 0, 0, 0.40)',
  ok: '0px 0px 0px 1px rgba(159, 221, 175, 0.16), 0px 2px 6px -2px rgba(0, 0, 0, 0.40)',
  glass: light.glass,
  bar: '0px 0px 0px 1px rgba(255, 255, 255, 0.08), 0px 12px 32px -10px rgba(0, 0, 0, 0.60)',
  sheet: '0px -1px 0px rgba(255, 255, 255, 0.08), 0px -8px 32px rgba(0, 0, 0, 0.50)',
};

/** Lues via `useShadows()` (thème actif), jamais directement dans un composant. */
export const shadows: Record<Scheme, Record<ShadowLevel, string>> = { light, dark };

// Rayons : cartes principales, lignes de liste, contrôles (boutons, tuiles de logo).
export const RADIUS = { card: 22, row: 18, control: 14, glass: 24, pill: 999 } as const;
