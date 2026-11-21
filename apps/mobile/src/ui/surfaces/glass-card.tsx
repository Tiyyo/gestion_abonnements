import type { ReactNode } from 'react';
import { YStack, type YStackProps } from 'tamagui';
import { elevated, RADIUS } from '@/theme/elevation';

// Verre sombre posé sur le dégradé du Hero. La teinte suffit à garantir les contrastes (mesurés par scripts/a11y-contrast.mjs),
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
