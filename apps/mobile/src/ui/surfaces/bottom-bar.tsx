import { type ReactNode } from 'react';
import { XStack } from 'tamagui';

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <XStack p="4" gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
      {children}
    </XStack>
  );
}
