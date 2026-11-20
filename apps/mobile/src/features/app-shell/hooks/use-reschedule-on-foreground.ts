import { useEffect } from 'react';
import { AppState } from 'react-native';
import { requestReschedule } from '@/notifications/scheduler';

/** Replanifie les notifications au lancement, puis à chaque retour de l'app au premier plan. */
export function useRescheduleOnForeground() {
  useEffect(() => {
    requestReschedule(0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        requestReschedule();
      }
    });
    return () => subscription.remove();
  }, []);
}
