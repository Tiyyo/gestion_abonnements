import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';

export function SheetFooter({ busy, label, onPress, disabled }: { busy: boolean; label: string; onPress: () => void; disabled?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <YStack p="4" pb={insets.bottom + 16} borderTopWidth={1} borderColor="borderColor" bg="surface">
      <ActionButton size="lg" label={busy ? 'Enregistrement…' : label} loading={busy} disabled={disabled} onPress={onPress} />
    </YStack>
  );
}
