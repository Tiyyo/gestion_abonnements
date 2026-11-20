import { CircleAlert, CircleCheck, CircleHelp, Info, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { ActionButton } from '@/ui/controls/action-button';
import { Body, Heading } from '@/ui/text/typography';
import { SheetPanel } from './sheet-panel';
import type { Dialog, DialogButton, DialogTone } from './show-dialog';

const TONES: Record<DialogTone, { icon: LucideIcon; bg: string; fg: string }> = {
  question: { icon: CircleHelp, bg: 'secondary', fg: colors.primary },
  info: { icon: Info, bg: 'subtle', fg: colors.text },
  ok: { icon: CircleCheck, bg: 'okBg', fg: colors.ok },
  warn: { icon: TriangleAlert, bg: 'warnBg', fg: colors.warn },
  danger: { icon: TriangleAlert, bg: 'dangerBg', fg: colors.danger },
  error: { icon: CircleAlert, bg: 'dangerBg', fg: colors.danger },
};

export function DialogSheet({ dialog, onClose }: { dialog: Dialog; onClose: (button?: DialogButton) => void }) {
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
            testID="dialog.confirm"
          />
        ) : null}
        {others.map((b, index) => (
          <ActionButton
            key={b.text}
            size="lg"
            label={b.text}
            variant={b.style === 'destructive' ? 'danger' : 'outline'}
            onPress={() => onClose(b)}
            testID={`dialog.other-${index}`}
          />
        ))}
        {cancel ? (
          <ActionButton
            size="lg"
            label={cancel.text}
            variant={main ? 'ghost' : 'outline'}
            onPress={() => onClose(cancel)}
            testID="dialog.cancel"
          />
        ) : null}
      </YStack>
    </SheetPanel>
  );
}
