import { XStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';
import { Heading } from '@/ui/text/typography';

export function SheetHeader({ title, onCancel }: { title: string; onCancel: () => void }) {
  return (
    <XStack px="2" minH={56} items="center" gap="1" bg="heroFrom">
      <ActionButton label="Annuler" variant="glassGhost" onPress={onCancel} />
      <Heading flex={1} fontSize={18} color="onGlass" numberOfLines={2}>
        {title}
      </Heading>
    </XStack>
  );
}
