import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';

export function FormFooter({ busy, label, onPress }: { busy: boolean; label: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <YStack p="4" pb={insets.bottom + 16} borderTopWidth={1} borderColor="borderColor" bg="surface">
      <ActionButton size="lg" label={busy ? 'Enregistrement…' : label} loading={busy} onPress={onPress} />
    </YStack>
  );
}
