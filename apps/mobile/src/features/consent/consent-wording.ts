import type { ConsentErrorKind } from './consent-error';

export type ConsentMessage = { title: string; message: string };

const ERRORS: Record<ConsentErrorKind, ConsentMessage> = {
  cancelled: {
    title: 'Autorisation annulée',
    message: 'Tu as quitté Revolut avant d’autoriser la lecture des soldes. L’accord actuel n’a pas changé.',
  },
  state_mismatch: {
    title: 'Retour inattendu',
    message: 'Ce retour de la banque ne correspond pas à la demande en cours. Relance le renouvellement depuis cet écran.',
  },
  expired: {
    title: 'Demande expirée',
    message: 'L’autorisation a pris plus d’un quart d’heure, ou son code a déjà servi. Relance le renouvellement.',
  },
  network: {
    title: 'Pas de réponse',
    message: 'Le serveur n’a pas répondu. Vérifie la connexion, puis réessaie.',
  },
  not_configured: {
    title: 'Renouvellement non configuré',
    message: 'La fonction des soldes n’accepte pas encore le renouvellement : il lui manque la clé Enable Banking ou l’adresse de retour.',
  },
  redirect_not_allowed: {
    title: 'Adresse de retour refusée',
    message:
      'Enable Banking ne connaît pas l’adresse de retour de la fonction. Enregistre-la dans les réglages de l’application Enable Banking.',
  },
  return_not_allowed: {
    title: 'Lien de retour refusé',
    message: 'La fonction ne renvoie pas vers cette version de l’app.',
  },
  no_accounts: {
    title: 'Comptes manquants',
    message: 'Revolut n’a pas partagé deux comptes. Recommence en cochant le compte courant et le coffre.',
  },
  browser: {
    title: 'Page de la banque inaccessible',
    message: 'Aucun navigateur n’a pu ouvrir la page de Revolut sur ce téléphone.',
  },
  storage: {
    title: 'Enregistrement impossible',
    message: 'Le coffre de clés du téléphone a refusé l’enregistrement. Réessaie.',
  },
  bank: {
    title: 'Banque indisponible',
    message: 'Revolut ou Enable Banking n’a pas répondu comme prévu. Réessaie dans quelques minutes.',
  },
};

/**
 * Message d'un échec du renouvellement. En développement, un lien de retour refusé rappelle l'adresse à ajouter
 * à `CONSENT_RETURN_URLS` (celle d'Expo Go dépend de la machine).
 */
export function consentErrorMessage(kind: ConsentErrorKind, returnUrl?: string): ConsentMessage {
  const base = ERRORS[kind];
  if (kind === 'return_not_allowed' && returnUrl) {
    return { ...base, message: `${base.message} Lien à ajouter à CONSENT_RETURN_URLS : ${returnUrl}` };
  }
  return base;
}
