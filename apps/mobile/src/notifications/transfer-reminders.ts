import { compareDates, formatEuros } from '@abonnements/core';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { dateShort } from '@/lib/dates';
import type { FireAt, PlannedNotification } from './types';

export function fundingReminder(t: PlanTransfer, at: FireAt): PlannedNotification {
  const names = t.charges.map((c) => c.name).join(', ');
  const due = t.charges.map((c) => c.dueDate).sort(compareDates)[0];
  return {
    kind: 'funding',
    refId: t.id,
    fireAt: at(t.effectiveDate),
    title: `Transfert à faire : ${formatEuros(t.amountCents)}`,
    body: `Coffre → compte principal pour ${names}${due ? ` (prélevé le ${dateShort(due)})` : ''}.`,
    url: '/',
  };
}

/** Notification immédiate pour les transferts en retard (une par jour au plus, via `refId`). */
export function overdueNotification(overdue: readonly PlanTransfer[], today: string): PlannedNotification | null {
  if (overdue.length === 0) {
    return null;
  }
  const total = overdue.reduce((sum, t) => sum + t.amountCents, 0);
  return {
    kind: 'funding',
    refId: `overdue:${today}`,
    fireAt: today,
    title: overdue.length === 1 ? 'Un transfert est en retard' : `${overdue.length} transferts sont en retard`,
    body: `${formatEuros(total)} à transférer du coffre vers le compte principal.`,
    url: '/',
  };
}
