import { type ShadowLevel, shadows } from './elevation';
import { useScheme } from './use-scheme';

/** Ombres du thème actif : `const shadow = useShadows()` puis `style={{ boxShadow: shadow.md }}`. */
export function useShadows(): Record<ShadowLevel, string> {
  return shadows[useScheme()];
}
