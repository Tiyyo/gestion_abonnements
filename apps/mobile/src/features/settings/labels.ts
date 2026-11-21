import type { ThemeMode } from '@/db/types';
import { formatPercentBp } from '@/lib/format';

export const marginLabel = formatPercentBp;

export function paydayLabel(day: number): string {
  return day === 1 ? 'le 1er du mois' : `le ${day} du mois`;
}

/** Choix du réglage « Apparence », dans l'ordre d'affichage. */
export const THEME_MODES: readonly { key: ThemeMode; label: string; hint?: string }[] = [
  { key: 'system', label: 'Système', hint: 'Suit le thème du téléphone.' },
  { key: 'light', label: 'Clair' },
  { key: 'dark', label: 'Sombre' },
];

export function themeModeLabel(mode: ThemeMode): string {
  return THEME_MODES.find((m) => m.key === mode)?.label ?? 'Système';
}

export function fundingLeadLabel(days: number): string {
  return `J-${days}, avancé au dernier jour ouvré`;
}

/** « J-3 » lu en clair par TalkBack. */
export function daysBeforeLabel(days: number): string {
  return days === 1 ? '1 jour avant' : `${days} jours avant`;
}
