import { formatPercentBp } from '@/lib/format';

export const marginLabel = formatPercentBp;

export function paydayLabel(day: number): string {
  return day === 1 ? 'le 1er du mois' : `le ${day} du mois`;
}

export function fundingLeadLabel(days: number): string {
  return `J-${days}, avancé au dernier jour ouvré`;
}

/** « J-3 » lu en clair par TalkBack. */
export function daysBeforeLabel(days: number): string {
  return days === 1 ? '1 jour avant' : `${days} jours avant`;
}
