import { useEffect } from 'react';
import { AppState } from 'react-native';

/** Lance `refresh` au montage puis à chaque retour au premier plan (par exemple depuis les réglages Android). */
export function useOnAppActive(refresh: () => void): void {
  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);
}
