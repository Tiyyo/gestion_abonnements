import { config } from './tamagui.config';

const palette = config.themes.light;
export const colors = {
  text: String(palette.color?.val ?? '#14181B'),
  muted: String(palette.colorMuted?.val ?? '#5B6670'),
  primary: String(palette.primary?.val ?? '#4C1E4F'),
  primarySoft: String(palette.primarySoft?.val ?? '#F1ECF1'),
  onPrimary: String(palette.onPrimary?.val ?? '#FFFFFF'),
  ok: String(palette.okText?.val ?? '#214F1E'),
  border: String(palette.borderColor?.val ?? '#E3E6E3'),
  danger: String(palette.dangerText?.val ?? '#8A1C1C'),
  warn: String(palette.warnText?.val ?? '#7A3E00'),
  background: String(palette.background?.val ?? '#F5F6F4'),
  surface: String(palette.surface?.val ?? '#FFFFFF'),
  borderControl: String(palette.borderControl?.val ?? '#838C94'),
  subtle: String(palette.subtle?.val ?? '#E9ECE9'),
  glassSkeleton: String(palette.glassSkeleton?.val ?? 'rgba(255, 255, 255, 0.16)'),
  scrim: String(palette.scrim?.val ?? 'rgba(20, 24, 27, 0.5)'),
  onGlass: String(palette.onGlass?.val ?? '#FFFFFF'),
  onGlassMuted: String(palette.onGlassMuted?.val ?? 'rgba(255, 255, 255, 0.78)'),
  onGlassOk: String(palette.onGlassOk?.val ?? '#CDEFD6'),
  onGlassWarn: String(palette.onGlassWarn?.val ?? '#FFD9A8'),
  onGlassDanger: String(palette.onGlassDanger?.val ?? '#FFC9C9'),
  heroFrom: String(palette.heroFrom?.val ?? '#3A143D'),
  heroTo: String(palette.heroTo?.val ?? '#1E0A20'),
  heroGlowWarm: String(palette.heroGlowWarm?.val ?? '#F6D5C4'),
  heroGlowCool: String(palette.heroGlowCool?.val ?? '#9C48A0'),
};
