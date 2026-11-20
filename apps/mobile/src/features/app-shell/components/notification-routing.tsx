import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

/** Ouvre l'écran indiqué par la dernière notification touchée (`data.url`). */
export function NotificationRouting() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') {
      router.navigate(url as never);
    }
  }, [response]);
  return null;
}
