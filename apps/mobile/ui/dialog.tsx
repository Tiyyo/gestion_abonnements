import { CircleAlert, CircleCheck, CircleHelp, Info, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { ActionButton, Body, colors, Heading } from './kit';
import { haptic } from './motion';
import { SHEET_EXIT_MS, SheetPanel } from './sheet';

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
export type DialogTone = 'question' | 'info' | 'ok' | 'warn' | 'danger' | 'error';

type DialogOptions = { tone?: DialogTone; cancelable?: boolean };
type Dialog = { id: number; title: string; message?: string; buttons: DialogButton[]; tone: DialogTone; cancelable: boolean };

const TONES: Record<DialogTone, { icon: LucideIcon; bg: string; fg: string }> = {
  question: { icon: CircleHelp, bg: 'secondary', fg: colors.primary },
  info: { icon: Info, bg: 'subtle', fg: colors.text },
  ok: { icon: CircleCheck, bg: 'okBg', fg: colors.ok },
  warn: { icon: TriangleAlert, bg: 'warnBg', fg: colors.warn },
  danger: { icon: TriangleAlert, bg: 'dangerBg', fg: colors.danger },
  error: { icon: CircleAlert, bg: 'dangerBg', fg: colors.danger },
};

let push: ((dialog: Dialog) => void) | null = null;
let nextId = 0;

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

export function DialogHost() {
  const [queue, setQueue] = useState<Dialog[]>([]);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    push = (dialog) => setQueue((q) => [...q, dialog]);
    return () => {
      push = null;
    };
  }, []);

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

function DialogSheet({ dialog, onClose }: { dialog: Dialog; onClose: (button?: DialogButton) => void }) {
  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  const actions = dialog.buttons.filter((b) => b.style !== 'cancel');
  const main = actions[actions.length - 1];
  const others = actions.slice(0, -1).reverse();
  const tone = TONES[dialog.tone];
  const Icon = tone.icon;
  const dismiss = () => {
    if (dialog.cancelable) {
      onClose(cancel);
    }
  };

  return (
    <SheetPanel onDismiss={dismiss} dismissLabel={cancel ? cancel.text : 'Fermer'}>
      <YStack gap="3" pt="2">
        <YStack w={48} h={48} rounded={24} items="center" justify="center" bg={tone.bg as 'subtle'}>
          <Icon color={tone.fg} size={24} strokeWidth={2} />
        </YStack>
        <YStack gap="1.5">
          <Heading accessibilityRole="header">{dialog.title}</Heading>
          {dialog.message ? <Body color="colorMuted">{dialog.message}</Body> : null}
        </YStack>
      </YStack>
      <YStack gap="2" pt="1">
        {main ? (
          <ActionButton
            size="lg"
            label={main.text}
            variant={main.style === 'destructive' ? 'dangerSolid' : 'primary'}
            onPress={() => onClose(main)}
          />
        ) : null}
        {others.map((b) => (
          <ActionButton
            key={b.text}
            size="lg"
            label={b.text}
            variant={b.style === 'destructive' ? 'danger' : 'outline'}
            onPress={() => onClose(b)}
          />
        ))}
        {cancel ? (
          <ActionButton size="lg" label={cancel.text} variant={main ? 'ghost' : 'outline'} onPress={() => onClose(cancel)} />
        ) : null}
      </YStack>
    </SheetPanel>
  );
}
