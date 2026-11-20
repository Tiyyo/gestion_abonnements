import { setNotificationCategoryAsync } from 'expo-notifications';
import { FUNDING_CATEGORY, MARK_DONE_ACTION } from './response';

/**
 * Déclare le bouton « Marquer fait » des rappels de transfert. L'action ouvre l'app : la commande s'exécute
 * au premier plan, une fois l'app déverrouillée (`NotificationRouting`).
 */
export async function ensureCategories(): Promise<void> {
  await setNotificationCategoryAsync(FUNDING_CATEGORY, [
    { identifier: MARK_DONE_ACTION, buttonTitle: 'Marquer fait', options: { opensAppToForeground: true } },
  ]);
}
