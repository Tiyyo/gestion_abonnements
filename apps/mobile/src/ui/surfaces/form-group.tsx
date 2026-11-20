import type { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { Card } from './card';
import { Overline } from '@/ui/text/typography';

export function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack gap="2">
      <Overline px="1">{title}</Overline>
      <Card py="0" gap="0">
        {children}
      </Card>
    </YStack>
  );
}
