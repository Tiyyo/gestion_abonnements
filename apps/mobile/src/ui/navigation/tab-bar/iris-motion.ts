import { Easing } from 'react-native-reanimated';
import { PILL_HEIGHT, PILL_RADIUS } from './tab-bar-metrics';

// Effet « iris » (porte des étoiles) : la capsule quittée pivote et se resserre en cercle, puis se referme en un point ;
// la capsule visée naît minuscule (mêmes proportions) et grandit d'un seul geste en pivotant jusqu'à sa forme finale.
// Courbes en `timing` sans rebond (règle du projet) ; Reanimated les saute si l'option système « supprimer les animations » est active.
export const CLOSE = { duration: 260, easing: Easing.in(Easing.cubic) } as const;
export const OPEN = { duration: 420, easing: Easing.bezier(0.2, 0, 0, 1) } as const;
export const OPEN_FROM_SCALE = 0.12;
export const OPEN_DELAY = 110;
export const TWIST_DEG = 90;

export type IrisGeometry = { scale: number; angle: number; w: number; radius: number };

/** Géométrie de la capsule à l'instant v (0 → 1) : échelle, rotation, largeur et rayon. */
export function geometry(v: number, isOpening: boolean, width: number): IrisGeometry {
  'worklet';
  if (isOpening) {
    // Ouverture : une capsule minuscule qui grandit et se redresse d'un seul mouvement.
    return { scale: OPEN_FROM_SCALE + (1 - OPEN_FROM_SCALE) * v, angle: -TWIST_DEG * (1 - v), w: width, radius: PILL_RADIUS };
  }
  // Fermeture : la capsule se resserre en cercle (première moitié), puis le cercle se referme en un point.
  const widen = Math.max((v - 0.5) / 0.5, 0);
  return {
    scale: Math.min(v / 0.5, 1),
    angle: -TWIST_DEG * (1 - v),
    w: PILL_HEIGHT + (width - PILL_HEIGHT) * widen,
    radius: PILL_HEIGHT / 2 + (PILL_RADIUS - PILL_HEIGHT / 2) * widen,
  };
}
