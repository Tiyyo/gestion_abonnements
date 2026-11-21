import * as Linking from 'expo-linking';
import { type ConsentReturn, parseReturnUrl } from './consent-return';

/**
 * Boîte de réception du retour de la banque. Le lien profond est capté ici, hors de l'arbre React, pour ne pas le perdre
 * quand l'app revient verrouillée (la pile de navigation n'est alors pas montée) ou redémarre à froid.
 * L'écran `/consent` y prend le retour ; `ConsentReturnRouting` l'ouvre s'il ne l'est pas.
 */
let waiting: ConsentReturn | null = null;
let started = false;
const listeners = new Set<() => void>();

/** Lien de retour annoncé à la fonction : `abonnements://consent` dans l'APK, `exp://…/--/consent` dans Expo Go. */
export function consentReturnUrl(): string {
  return Linking.createURL('consent');
}

function receive(url: string | null): void {
  const ret = url ? parseReturnUrl(url, consentReturnUrl()) : null;
  if (ret) {
    waiting = ret;
    listeners.forEach((listener) => listener());
  }
}

/** À appeler une fois au chargement de l'app. Le lien de lancement n'est lu qu'ici, pour ne jamais le rejouer. */
export function startConsentInbox(): void {
  if (started) {
    return;
  }
  started = true;
  Linking.addEventListener('url', ({ url }) => receive(url));
  Linking.getInitialURL()
    .then(receive)
    .catch(() => undefined);
}

export function subscribeConsentInbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function peekConsentReturn(): ConsentReturn | null {
  return waiting;
}

/** Retire le retour en attente : un code d'autorisation ne sert qu'une fois. */
export function takeConsentReturn(): ConsentReturn | null {
  const ret = waiting;
  waiting = null;
  if (ret) {
    listeners.forEach((listener) => listener());
  }
  return ret;
}
