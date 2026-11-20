import { type ReactNode } from 'react';
import { XStack } from 'tamagui';
import { Heading } from './typography';

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <XStack mt="3" minH={44} items="center" justify="space-between" gap="3">
      <Heading shrink={1}>{children}</Heading>
      {action}
    </XStack>
  );
}
