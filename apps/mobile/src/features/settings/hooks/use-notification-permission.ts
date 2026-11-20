import { useCallback, useState } from 'react';
import { requestNotifications, notificationsAllowed } from '@/notifications/permissions';
import { requestReschedule } from '@/notifications/scheduler';
import { AndroidSetting, openAndroidSetting } from '@/features/settings/android-settings';
import { useOnAppActive } from './use-on-app-active';

/** Autorisation Android des notifications, relue au retour au premier plan (null tant qu'elle n'est pas lue). */
export function useNotificationPermission() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useOnAppActive(useCallback(() => void notificationsAllowed().then(setAllowed), []));

  // Refus définitif : Android n'affiche plus la demande, on ouvre la fiche de l'app.
  const authorize = () =>
    requestNotifications().then((ok) => {
      setAllowed(ok);
      if (ok) {
        requestReschedule(0);
      } else {
        openAndroidSetting(AndroidSetting.APPLICATION_DETAILS_SETTINGS, true);
      }
    });

  return { allowed, authorize };
}
