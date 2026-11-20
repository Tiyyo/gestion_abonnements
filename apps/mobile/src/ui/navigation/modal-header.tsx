import { router } from 'expo-router';
import { XStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';
import { Heading } from '@/ui/text/typography';

export function ModalHeader({ title, onCancel }: { title?: string; onCancel?: () => void }) {
  return (
    <XStack px="2" minH={52} items="center" gap="1">
      <ActionButton label="Annuler" variant="ghost" onPress={onCancel ?? (() => router.back())} />
      {title ? (
        <Heading flex={1} fontSize={22} numberOfLines={1}>
          {title}
        </Heading>
      ) : null}
    </XStack>
  );
}
