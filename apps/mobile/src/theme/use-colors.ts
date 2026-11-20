import { colorSets, type ThemeColors } from './colors';
import { useScheme } from './use-scheme';

/**
 * Couleurs du thème actif pour ce qui ne passe pas par les props Tamagui (icônes, `TextInput`, styles Reanimated).
 * Dans un worklet, lire les valeurs hors du worklet (`const { primary } = useColors()`) puis les capturer.
 */
export function useColors(): ThemeColors {
  return colorSets[useScheme()];
}
