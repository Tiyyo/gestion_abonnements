import { formatEuros } from '@abonnements/core';
import { lastDayOfMonth, monthKey } from '@/db/repositories/plan/period';
import type { FireAt, PlannedNotification } from './types';

export function paydayReminder(start: string, totalCents: number, at: FireAt): PlannedNotification {
  return {
    kind: 'payday',
    refId: `payday:${start}`,
    fireAt: at(start),
    title: `Virement de paie : ${formatEuros(totalCents)}`,
    body: 'Banque → Revolut → coffre. Marque-le fait dans le Plan.',
    url: '/plan',
  };
}

export function residualReminder(year: number, month: number, at: FireAt): PlannedNotification {
  return {
    kind: 'residual',
    refId: `residual:${monthKey(year, month)}`,
    fireAt: at(lastDayOfMonth(year, month)),
    title: 'Résidu du mois',
    body: 'Vérifie le résidu estimé et renvoie-le au coffre.',
    url: '/plan',
  };
}
