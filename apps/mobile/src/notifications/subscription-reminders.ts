import { addDays, formatEuros } from '@abonnements/core';
import type { Subscription } from '@/db/types';
import { dateShort, relativeDay } from '@/lib/dates';
import type { FireAt, PlannedNotification } from './types';

/** Rappels avant la fin d'un essai, puis question à J+1. */
export function trialReminders(sub: Subscription, trialEndDate: string, days: readonly number[], at: FireAt): PlannedNotification[] {
  return [
    ...days.map((n) => ({
      kind: 'trial_end' as const,
      refId: sub.id,
      fireAt: at(addDays(trialEndDate, -n)),
      title: `Fin d’essai ${sub.name} ${relativeDay(n)}`,
      body: `Sans décision, le prélèvement de ${formatEuros(sub.amount_cents)} du ${dateShort(trialEndDate)} échouera. Garde-le ou résilie-le.`,
      url: `/subscriptions/${sub.id}`,
    })),
    {
      kind: 'trial_end',
      refId: sub.id,
      fireAt: at(addDays(trialEndDate, 1)),
      title: `${sub.name} : le prélèvement est-il passé ?`,
      body: 'L’essai est terminé. Indique si le prélèvement est passé ou a échoué.',
      url: '/',
    },
  ];
}

/** Rappels avant la fin d'une période à résilier, puis demande de confirmation à J+1. */
export function cancelReminders(sub: Subscription, periodEndDate: string, days: readonly number[], at: FireAt): PlannedNotification[] {
  return [
    ...days.map((n) => ({
      kind: 'cancel_end' as const,
      refId: sub.id,
      fireAt: at(addDays(periodEndDate, -n)),
      title: `Résilier ${sub.name} ${relativeDay(n)}`,
      body: `La période se termine le ${dateShort(periodEndDate)}. Pense à résilier chez le marchand.`,
      url: `/subscriptions/${sub.id}`,
    })),
    {
      kind: 'cancel_end',
      refId: sub.id,
      fireAt: at(addDays(periodEndDate, 1)),
      title: `As-tu bien résilié ${sub.name} ?`,
      body: 'La période est terminée. Confirme la résiliation pour clore l’abonnement.',
      url: '/',
    },
  ];
}
