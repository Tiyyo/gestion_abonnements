import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { haptic } from '@/ui/motion/haptics';
import { DialogSheet } from './dialog-sheet';
import { SHEET_EXIT_MS } from './sheet-timing';
import { type Dialog, type DialogButton, registerDialogHost } from './show-dialog';

export function DialogHost() {
  const [queue, setQueue] = useState<Dialog[]>([]);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => registerDialogHost((dialog) => setQueue((q) => [...q, dialog])), []);

  const current = queue[0];
  const currentId = current?.id;
  const currentTone = current?.tone;

  useEffect(() => {
    if (currentTone === 'error' || currentTone === 'danger') {
      haptic.error();
    } else if (currentTone === 'warn') {
      haptic.warn();
    } else if (currentTone === 'ok') {
      haptic.success();
    }
  }, [currentId, currentTone]);

  const close = (button?: DialogButton) => {
    if (leaving) {
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      setQueue((q) => q.slice(1));
      setLeaving(false);
      button?.onPress?.();
    }, SHEET_EXIT_MS);
  };

  return (
    <Modal
      visible={!!current}
      transparent
      animationType="none"
      navigationBarTranslucent
      onRequestClose={() => {
        if (current?.cancelable) {
          close(current.buttons.find((b) => b.style === 'cancel'));
        }
      }}
    >
      <SafeAreaProvider>{current && !leaving ? <DialogSheet key={current.id} dialog={current} onClose={close} /> : null}</SafeAreaProvider>
    </Modal>
  );
}
