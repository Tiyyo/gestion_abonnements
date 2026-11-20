import { type ReactNode } from 'react';
import { XStack } from 'tamagui';
import { Amount, Body } from '@/ui/text/typography';

export function KeyValue({ label, value, last, children }: { label: string; value?: string; last?: boolean; children?: ReactNode }) {
  return (
    <XStack py="3" minH={52} gap="4" items="center" justify="space-between" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <Body color="colorMuted" shrink={1}>
        {label}
      </Body>
      {children ?? (
        <Amount text="right" shrink={1}>
          {value}
        </Amount>
      )}
    </XStack>
  );
}
