export type Scheme = 'light' | 'dark';

/**
 * Palettes claire et sombre : mêmes noms de tokens, lus par la config Tamagui et par `useColors()`.
 * Chaque couple texte/fond est mesuré dans `palette.test.ts` (4,5:1 pour le texte, 3:1 pour les contrôles).
 * `primary` est un aplat (libellé `onPrimary`) ; un texte, une icône ou un liseré aubergine posé sur une surface utilise `primaryText`.
 */
export const lightPalette = {
  background: '#F5F6F4',
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  thumb: '#FFFFFF',
  logoTile: '#FFFFFF',
  borderColor: '#E3E6E3',
  borderControl: '#838C94',
  subtle: '#E9ECE9',
  color: '#14181B',
  colorMuted: '#5B6670',
  primary: '#4C1E4F',
  onPrimary: '#FFFFFF',
  primaryText: '#4C1E4F',
  primarySoft: '#F1ECF1',
  secondary: '#F6D5C4',
  onSecondary: '#4C1E4F',
  warnBg: '#FFF4E5',
  warnBorder: '#F0C48A',
  warnText: '#7A3E00',
  warnSolid: '#7A3E00',
  okBg: '#E8F5EE',
  okText: '#214F1E',
  dangerBg: '#FDE8E8',
  dangerText: '#8A1C1C',
  dangerSolid: '#8A1C1C',
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

export type Palette = Record<keyof typeof lightPalette, string>;

// Sombre : surfaces teintées d'aubergine (jamais de gris pur), élévation par surfaces plus claires (background < surface < subtle < raised).
// Le Hero, le verre et les couleurs `onGlass*` ne changent pas : le dégradé est déjà sombre.
export const darkPalette: Palette = {
  ...lightPalette,
  background: '#151016',
  surface: '#211A23',
  raised: '#4A3E4E',
  thumb: '#F3EEF4',
  borderColor: '#3A303D',
  borderControl: '#8C8090',
  subtle: '#2E2531',
  color: '#F3EEF4',
  colorMuted: '#B9AEBD',
  primary: '#A055A5',
  primaryText: '#E3B8E6',
  primarySoft: '#3A2540',
  warnBg: '#30220D',
  warnBorder: '#7A5A22',
  warnText: '#FFCF8F',
  warnSolid: '#B05E00',
  okBg: '#16301F',
  okText: '#9FDDAF',
  dangerBg: '#3D1A1C',
  dangerText: '#FFB3B3',
  dangerSolid: '#D23B33',
  scrim: 'rgba(0, 0, 0, 0.6)',
  barFill: 'rgba(33, 26, 35, 0.88)',
  barEdge: 'rgba(255, 255, 255, 0.10)',
};

export const palettes: Record<Scheme, Palette> = { light: lightPalette, dark: darkPalette };
