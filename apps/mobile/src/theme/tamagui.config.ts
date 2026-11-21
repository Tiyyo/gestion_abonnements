import { animationPresets } from '@tamagui/animation-helpers';
import { createAnimations } from '@tamagui/animations-reanimated';
import { createV6Config, themes } from '@tamagui/config/v6';
import { createTamagui } from 'tamagui';

const palette = {
  background: '#F5F6F4',
  surface: '#FFFFFF',
  borderColor: '#E3E6E3',
  borderControl: '#838C94',
  subtle: '#E9ECE9',
  color: '#14181B',
  colorMuted: '#5B6670',
  primary: '#4C1E4F',
  onPrimary: '#FFFFFF',
  secondary: '#F6D5C4',
  onSecondary: '#4C1E4F',
  warnBg: '#FFF4E5',
  warnBorder: '#F0C48A',
  warnText: '#7A3E00',
  okBg: '#E8F5EE',
  okText: '#214F1E',
  dangerBg: '#FDE8E8',
  dangerText: '#8A1C1C',
  primarySoft: '#F1ECF1',
  scrim: 'rgba(20, 24, 27, 0.5)',
  heroFrom: '#3A143D',
  heroTo: '#1E0A20',
  heroGlowWarm: '#F6D5C4',
  heroGlowCool: '#9C48A0',
  glassFill: 'rgba(255, 255, 255, 0.12)',
  glassInner: 'rgba(255, 255, 255, 0.08)',
  glassEdge: 'rgba(255, 255, 255, 0.20)',
  glassSkeleton: 'rgba(255, 255, 255, 0.16)',
  onGlass: '#FFFFFF',
  onGlassMuted: 'rgba(255, 255, 255, 0.78)',
  onGlassOk: '#CDEFD6',
  onGlassWarn: '#FFD9A8',
  onGlassDanger: '#FFC9C9',
  barFill: 'rgba(255, 255, 255, 0.88)',
  barEdge: 'rgba(255, 255, 255, 0.90)',
};

const base = createV6Config({ themes: { light: { ...themes.light, ...palette } } });

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
