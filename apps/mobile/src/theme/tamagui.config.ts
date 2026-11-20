import { animationPresets } from '@tamagui/animation-helpers';
import { createAnimations } from '@tamagui/animations-reanimated';
import { createV6Config, themes } from '@tamagui/config/v6';
import { createTamagui } from 'tamagui';
import { darkPalette, lightPalette } from './palette';

// Deux thèmes aux mêmes noms de tokens (`palette.ts`) : un composant ne nomme jamais une couleur, seulement un token.
const base = createV6Config({
  themes: { light: { ...themes.light, ...lightPalette }, dark: { ...themes.dark, ...darkPalette } },
});

const animations = createAnimations({
  ...animationPresets,
  fast: { type: 'timing', duration: 120 },
  smooth: { type: 'timing', duration: 200 },
});

export const config = createTamagui({ ...base, animations });

type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- l'augmentation de module de Tamagui exige une interface vide qui étend la config
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
