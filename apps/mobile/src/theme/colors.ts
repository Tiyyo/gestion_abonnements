import { type Palette, palettes, type Scheme } from './palette';

/** Couleurs lues hors Tamagui (icônes lucide, `TextInput`, Reanimated, dégradé du Hero), sous des noms courts. */
function toColors(p: Palette) {
  return {
    text: p.color,
    muted: p.colorMuted,
    primary: p.primary,
    primarySoft: p.primarySoft,
    onPrimary: p.onPrimary,
    primaryText: p.primaryText,
    onSecondary: p.onSecondary,
    ok: p.okText,
    danger: p.dangerText,
    warn: p.warnText,
    border: p.borderColor,
    borderControl: p.borderControl,
    subtle: p.subtle,
    glassSkeleton: p.glassSkeleton,
    background: p.background,
    surface: p.surface,
    thumb: p.thumb,
    scrim: p.scrim,
    onGlass: p.onGlass,
    onGlassMuted: p.onGlassMuted,
    onGlassOk: p.onGlassOk,
    onGlassWarn: p.onGlassWarn,
    onGlassDanger: p.onGlassDanger,
    heroFrom: p.heroFrom,
    heroTo: p.heroTo,
    heroGlowWarm: p.heroGlowWarm,
    heroGlowCool: p.heroGlowCool,
  };
}

export type ThemeColors = ReturnType<typeof toColors>;

/** Un objet stable par thème : utilisable tel quel en dépendance de `useMemo` ou capturé par un worklet. */
export const colorSets: Record<Scheme, ThemeColors> = { light: toColors(palettes.light), dark: toColors(palettes.dark) };
