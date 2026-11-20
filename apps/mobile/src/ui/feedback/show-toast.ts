import type { Toast, ToastAction, ToastTone } from './toast-logic';

export type ToastOptions = { action?: ToastAction; tone?: ToastTone };
type ToastHostHandle = { show: (toast: Toast) => void; hide: () => void };

let host: ToastHostHandle | null = null;
let nextId = 0;

/** Branche l'hôte monté (`ToastHost`) ; renvoie la fonction qui le débranche. */
export function registerToastHost(handle: ToastHostHandle): () => void {
  host = handle;
  return () => {
    if (host === handle) {
      host = null;
    }
  };
}

/**
 * Message bref en bas de l'écran, sans bloquer : résultat d'une action déjà faite, avec au besoin une action « Annuler ».
 * Un nouveau message remplace le précédent. Réservé aux actions réversibles ; une action irréversible garde `showDialog`.
 */
export function showToast(message: string, options?: ToastOptions): void {
  host?.show({ id: ++nextId, message, tone: options?.tone ?? 'ok', action: options?.action });
}

export function hideToast(): void {
  host?.hide();
}
