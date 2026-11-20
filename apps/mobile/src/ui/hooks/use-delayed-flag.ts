import { useEffect, useState } from 'react';
import { SKELETON_DELAY_MS, startDelay } from './delayed-flag';

/** Vrai seulement si `active` dure plus longtemps que le délai : évite le clignotement d'un écran fantôme sur un chargement bref. */
export function useDelayedFlag(active: boolean, delayMs: number = SKELETON_DELAY_MS): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      return;
    }
    const cancel = startDelay(() => setElapsed(true), delayMs);
    return () => {
      cancel();
      setElapsed(false);
    };
  }, [active, delayMs]);
  return active && elapsed;
}
