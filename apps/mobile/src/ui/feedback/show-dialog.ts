import { Alert } from 'react-native';

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
export type DialogTone = 'question' | 'info' | 'ok' | 'warn' | 'danger' | 'error';

export type DialogOptions = { tone?: DialogTone; cancelable?: boolean };
export type Dialog = { id: number; title: string; message?: string; buttons: DialogButton[]; tone: DialogTone; cancelable: boolean };

let push: ((dialog: Dialog) => void) | null = null;
let nextId = 0;

/** Branche l'hôte monté (`DialogHost`) ; renvoie la fonction qui le débranche. Sans hôte, repli sur `Alert.alert`. */
export function registerDialogHost(handler: (dialog: Dialog) => void): () => void {
  push = handler;
  return () => {
    push = null;
  };
}

export function showDialog(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions): void {
  const list = buttons?.length ? buttons : [{ text: 'OK' }];
  if (!push) {
    Alert.alert(title, message, list);
    return;
  }
  const tone = options?.tone ?? (list.some((b) => b.style === 'destructive') ? 'danger' : list.length > 1 ? 'question' : 'info');
  push({ id: ++nextId, title, message, buttons: list, tone, cancelable: options?.cancelable ?? true });
}

export function showError(title: string, message?: string): void {
  showDialog(title, message, undefined, { tone: 'error' });
}
