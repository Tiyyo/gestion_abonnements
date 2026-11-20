export type ToastTone = 'ok' | 'info';
export type ToastAction = { label: string; onPress: () => void };
export type Toast = { id: number; message: string; tone: ToastTone; action?: ToastAction };

export type ToastEvent = { type: 'show'; toast: Toast } | { type: 'dismiss'; id: number } | { type: 'clear' };

/**
 * Un seul message à la fois : un nouveau remplace le précédent (dont l'action « Annuler » est alors perdue, comme prévu).
 * `dismiss` vise un message précis : la minuterie d'un message déjà remplacé ne ferme pas son successeur.
 */
export function toastReducer(current: Toast | null, event: ToastEvent): Toast | null {
  switch (event.type) {
    case 'show':
      return event.toast;
    case 'dismiss':
      return current?.id === event.id ? null : current;
    case 'clear':
      return null;
  }
}

export const TOAST_MS = 5000;
export const TOAST_ACTION_MS = 8000;
export const TOAST_SCREEN_READER_MS = 20000;

/** Durée d'affichage : plus longue avec une action, et bien plus avec TalkBack (le temps d'entendre l'annonce puis d'atteindre le bouton). */
export function toastDuration(toast: Pick<Toast, 'action'>, screenReader: boolean): number {
  if (!toast.action) {
    return TOAST_MS;
  }
  return screenReader ? TOAST_SCREEN_READER_MS : TOAST_ACTION_MS;
}

export const TOAST_KEYBOARD_GAP = 12;

/**
 * Distance entre le bas de l'hôte et le bas du message. Sans clavier : au-dessus de la barre d'onglets flottante
 * (`restingOffset`, encart système compris). Avec clavier : juste au-dessus de lui, que la fenêtre ait été redimensionnée
 * ou non (on ne compte que la partie de l'hôte réellement recouverte).
 */
export function toastBottom(input: { hostHeight: number; keyboardTop: number | null; restingOffset: number }): number {
  const { hostHeight, keyboardTop, restingOffset } = input;
  if (keyboardTop === null || hostHeight <= 0) {
    return restingOffset;
  }
  return Math.max(0, hostHeight - keyboardTop) + TOAST_KEYBOARD_GAP;
}
