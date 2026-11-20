/** Délai avant d'afficher un écran fantôme : en dessous, le chargement est trop court pour mériter un état intermédiaire. */
export const SKELETON_DELAY_MS = 150;

/** Appelle `onElapsed` une fois le délai écoulé ; la fonction renvoyée annule l'attente. */
export function startDelay(onElapsed: () => void, delayMs: number): () => void {
  const timer = setTimeout(onElapsed, delayMs);
  return () => clearTimeout(timer);
}
