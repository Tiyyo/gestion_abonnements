import type { PeriodUnit, SubscriptionStatus } from '@abonnements/core';
import { dateWithWeekday } from '@/lib/dates';
import { transferLabel } from './detail-labels';

const EVERY: Record<PeriodUnit, { one: string; many: (count: number) => string }> = {
  week: { one: 'par semaine', many: (count) => `toutes les ${count} semaines` },
  month: { one: 'par mois', many: (count) => `tous les ${count} mois` },
  year: { one: 'par an', many: (count) => `tous les ${count} ans` },
};

/** Rythme sous le grand montant : « par mois », « tous les 2 ans ». */
export function everyLabel(unit: PeriodUnit, count: number): string {
  return count > 1 ? EVERY[unit].many(count) : EVERY[unit].one;
}

interface HeroRow {
  status: SubscriptionStatus;
  trial_end_date: string | null;
  period_end_date: string | null;
  cancel_done: number;
  next_charge_date: string;
  period_unit: PeriodUnit;
  period_count: number;
}

/** Bandeau d'alerte affiché sous l'en-tête : essai en cours ou abonnement à résilier, rien sinon. */
export function noticeKind(row: Pick<HeroRow, 'status' | 'trial_end_date' | 'period_end_date'>): 'trial' | 'to_cancel' | null {
  if (row.status === 'trial' && row.trial_end_date) {
    return 'trial';
  }
  if (row.status === 'to_cancel' && row.period_end_date) {
    return 'to_cancel';
  }
  return null;
}

/** Légende du grand montant : le rythme, et pour un essai le rappel que rien n'est encore prélevé. */
export function heroAmountCaption(row: HeroRow): string {
  const every = everyLabel(row.period_unit, row.period_count);
  return noticeKind(row) === 'trial' ? `${every}, après l’essai` : every;
}

export interface HeroFact {
  label: string;
  value: string;
}

/** Échéances mises en avant dans la carte en verre, selon le statut (aucune pour un abonnement résilié). */
export function heroFacts(row: HeroRow, nextCharge: Parameters<typeof transferLabel>[0], today: string): HeroFact[] {
  const kind = noticeKind(row);
  if (kind === 'trial' && row.trial_end_date) {
    return [{ label: 'Fin d’essai', value: dateWithWeekday(row.trial_end_date, today) }];
  }
  if (kind === 'to_cancel' && row.period_end_date) {
    return [
      { label: 'Fin de période', value: dateWithWeekday(row.period_end_date, today) },
      { label: 'Résiliation chez le marchand', value: row.cancel_done ? 'Faite' : 'À faire' },
    ];
  }
  if (row.status === 'cancelled') {
    return [];
  }
  return [
    { label: 'Prochain prélèvement', value: dateWithWeekday(row.next_charge_date, today) },
    { label: 'Transfert prévu', value: transferLabel(nextCharge) },
  ];
}
