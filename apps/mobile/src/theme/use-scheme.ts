import { useThemeName } from 'tamagui';
import type { Scheme } from './palette';

/** Thème actif (celui du `Theme` Tamagui le plus proche) : le composant est rendu à nouveau quand il change. */
export function useScheme(): Scheme {
  return useThemeName().startsWith('dark') ? 'dark' : 'light';
}
