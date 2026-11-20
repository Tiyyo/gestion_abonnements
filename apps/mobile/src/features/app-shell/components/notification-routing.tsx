import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useNotificationMarkDone } from '@/features/app-shell/hooks/use-notification-mark-done';
import { interpretResponse } from '@/notifications/response';

// Ce composant est remonté à chaque déverrouillage : la dernière réponse ne doit être suivie qu'une fois par session.
let handledKey: string | null = null;

/**
 * Suit la dernière notification touchée, y compris celle qui a lancé l'app : ouvre l'écran indiqué (`data.url`) et,
 * pour le bouton « Marquer fait » d'un rappel de transfert, marque ce transfert fait. Monté derrière le verrou
 * biométrique : rien n'est appliqué tant que l'app est verrouillée.
 */
export function NotificationRouting() {
  const response = Notifications.useLastNotificationResponse();
  const { mutate: markDone } = useNotificationMarkDone();
  useEffect(() => {
    if (!response) {
      return;
    }
    const { request } = response.notification;
    const intent = interpretResponse({ requestId: request.identifier, actionId: response.actionIdentifier, data: request.content.data });
    if (intent.key === handledKey) {
      return;
    }
    handledKey = intent.key;
    if (intent.url) {
      router.navigate(intent.url as never);
    }
    if (intent.markDoneTransferId) {
      markDone({ transferId: intent.markDoneTransferId, responseKey: intent.key });
      Notifications.dismissNotificationAsync(request.identifier).catch(() => undefined);
    }
  }, [response, markDone]);
  return null;
}
