import { type ReactNode } from 'react';
import { YStack } from 'tamagui';
import { Body } from '@/ui/text/typography';

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <YStack px="6" mt="10" gap="4" items="center">
      <Body color="colorMuted" text="center">
        {message}
      </Body>
      {action}
    </YStack>
  );
}
