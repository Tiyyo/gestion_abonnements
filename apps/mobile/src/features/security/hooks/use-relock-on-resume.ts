import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const RELOCK_AFTER_MS = 60_000;

/** Appelle `relock` au retour au premier plan après plus d'une minute en arrière-plan, tant que `enabled`. */
export function useRelockOnResume(enabled: boolean, relock: () => void): void {
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
      } else if (state === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) {
        backgroundAt.current = null;
        relock();
      }
    });
    return () => subscription.remove();
  }, [enabled, relock]);
}
