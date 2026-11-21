import { dateShort, dateShortYear } from '@/lib/dates';

export type ServiceState = 'ok' | 'off' | 'warn';

export type ServiceStatus = { state: ServiceState; status: string };

/** Revolut : l'accord Enable Banking est valable tant qu'une date de fin est connue. */
export function revolutStatus(consentUntil: string | undefined): ServiceStatus {
  return consentUntil
    ? { state: 'ok', status: `accord jusqu’au ${dateShortYear(consentUntil)}` }
    : { state: 'off', status: 'soldes indisponibles' };
}

/** Rappels : `notificationsAllowed` vaut null tant que l'autorisation Android n'a pas été lue. */
export function remindersStatus(remindersOn: boolean, notificationsAllowed: boolean | null): ServiceStatus {
  if (!remindersOn) {
    return { state: 'off', status: 'coupés' };
  }
  return notificationsAllowed === false ? { state: 'warn', status: 'autorisation Android requise' } : { state: 'ok', status: 'activés' };
}

/** Rapprochement automatique : `syncedThrough` est le jour de la dernière lecture complète du compte. */
export function reconcileStatus(included: boolean, on: boolean, syncedThrough: string | null): ServiceStatus {
  if (!included) {
    return { state: 'off', status: 'non inclus' };
  }
  if (!on) {
    return { state: 'off', status: 'coupé' };
  }
  return syncedThrough
    ? { state: 'ok', status: `compte relu le ${dateShort(syncedThrough)}` }
    : { state: 'off', status: 'pas encore relu' };
}

export function aiSuggestionStatus(enrichIncluded: boolean, aiOn: boolean): ServiceStatus {
  if (!enrichIncluded) {
    return { state: 'off', status: 'non incluse' };
  }
  return aiOn ? { state: 'ok', status: 'active' } : { state: 'off', status: 'coupée' };
}
