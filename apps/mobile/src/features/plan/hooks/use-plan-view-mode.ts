import { useState } from 'react';

export type PlanViewMode = 'list' | 'calendar';

// Retenu pour la session : survit au démontage de l'écran, pas au redémarrage de l'app.
let remembered: PlanViewMode = 'list';

/** Affichage du Plan (liste ou calendrier), mémorisé le temps de la session. */
export function usePlanViewMode(): [PlanViewMode, (mode: PlanViewMode) => void] {
  const [mode, setMode] = useState<PlanViewMode>(remembered);
  const change = (next: PlanViewMode) => {
    remembered = next;
    setMode(next);
  };
  return [mode, change];
}
