import type { ReactNode } from 'react';
import { YStack, type YStackProps } from 'tamagui';
import { elevated, RADIUS } from './elevation';

// Verre sombre posé sur le dégradé du Hero. La teinte suffit à garantir les contrastes (blanc 11,6:1, blanc 72 % 6,6:1),
// sans flou : derrière, le dégradé défile avec la carte, un flou n'y changerait rien.
export function GlassCard({ children, ...props }: YStackProps & { children: ReactNode }) {
  return (
    <YStack
      bg="glassFill"
      borderWidth={1}
      borderColor="glassEdge"
      rounded={RADIUS.glass}
      p="4"
      gap="3"
      style={elevated('glass')}
      {...props}
    >
      {children}
    </YStack>
  );
}

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
