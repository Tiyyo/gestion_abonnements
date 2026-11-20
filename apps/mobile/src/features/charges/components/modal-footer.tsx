import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';

/** Barre d'actions collée en bas d'une modale, au-dessus de la barre de navigation. */
export function ModalFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
      {children}
    </XStack>
  );
}
