import { useEffect } from 'react';
import { AppState } from 'react-native';
import { requestWidgetRefresh } from '@/features/widget/refresher';

/** Met à jour le widget de l'écran d'accueil au lancement, au retour au premier plan et au passage en arrière-plan. */
export function useWidgetSync() {
  useEffect(() => {
    requestWidgetRefresh(0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') {
        requestWidgetRefresh(state === 'background' ? 0 : undefined);
      }
    });
    return () => subscription.remove();
  }, []);
}
