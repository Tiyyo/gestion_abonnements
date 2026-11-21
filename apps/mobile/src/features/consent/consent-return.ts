import type { PendingConsent } from './bank-link';
import { ConsentError } from './consent-error';

/** Une demande d'accord non terminée au bout de ce délai est abandonnée. */
export const PENDING_TTL_MS = 15 * 60 * 1000;

/** Paramètres du lien profond par lequel le navigateur revient de la banque. */
export type ConsentReturn = { code: string | null; state: string | null; error: string | null };

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return '';
  }
}

/**
 * Lit un lien profond : `null` s'il ne s'agit pas du retour de la banque (autre route, ou ni code ni erreur).
 * `returnUrl` est le lien annoncé à `…/consent/start` (`abonnements://consent` dans l'APK, `exp://…/--/consent` dans Expo Go).
 */
export function parseReturnUrl(url: string, returnUrl: string): ConsentReturn | null {
  const [base = '', rest = ''] = url.split('#')[0]!.split('?');
  if (base.replace(/\/+$/, '') !== returnUrl.replace(/\/+$/, '')) {
    return null;
  }
  const params = new Map<string, string>();
  for (const pair of rest.split('&')) {
    const [key = '', value = ''] = pair.split('=');
    if (key && !params.has(decode(key))) {
      params.set(decode(key), decode(value));
    }
  }
  const result = { code: params.get('code') || null, state: params.get('state') || null, error: params.get('error') || null };
  return result.code || result.error ? result : null;
}

/**
 * Valide le retour de la banque face à la demande en cours et renvoie le code à échanger.
 * Un `state` différent de celui reçu au départ est toujours refusé : le lien ne vient pas de notre demande.
 */
export function checkReturn(ret: ConsentReturn, pending: PendingConsent | null, now: number): string {
  if (ret.state !== null && ret.state !== pending?.state) {
    throw new ConsentError('state_mismatch');
  }
  if (ret.error) {
    throw new ConsentError(ret.error === 'access_denied' ? 'cancelled' : 'bank');
  }
  if (!pending || ret.state === null) {
    throw new ConsentError('state_mismatch');
  }
  if (now - pending.startedAt > PENDING_TTL_MS) {
    throw new ConsentError('expired');
  }
  if (!ret.code) {
    throw new ConsentError('bank');
  }
  return ret.code;
}
