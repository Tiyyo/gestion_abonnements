import type { ReactNode } from 'react';
import { YStack, type YStackProps } from 'tamagui';
import { RADIUS } from '@/theme/elevation';

export function GlassPanel({ children, ...props }: YStackProps & { children: ReactNode }) {
  return (
    <YStack
      flex={1}
      bg="glassInner"
      borderWidth={1}
      borderColor="glassEdge"
      rounded={RADIUS.glass - 8}
      px="3"
      py="2.5"
      gap="0.5"
      {...props}
    >
      {children}
    </YStack>
  );
}
