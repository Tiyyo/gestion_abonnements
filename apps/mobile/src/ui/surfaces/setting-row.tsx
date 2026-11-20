import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { Body, Caption } from '@/ui/text/typography';

export function SettingRow({ label, hint, children, last }: { label: string; hint?: string; children?: ReactNode; last?: boolean }) {
  return (
    <XStack py="3" gap="3" minH={56} items="center" justify="space-between" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <YStack flex={1} gap="0.5">
        <Body>{label}</Body>
        {hint && <Caption>{hint}</Caption>}
      </YStack>
      {children}
    </XStack>
  );
}
