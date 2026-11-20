import type { ReactNode } from 'react';
import { YStack, type YStackProps } from 'tamagui';
import { BUSY_A11Y } from './busy-a11y';

/** Conteneur d'un écran fantôme : annoncé une seule fois « Chargement… » aux lecteurs d'écran. */
export function SkeletonGroup({ children, ...props }: YStackProps & { children: ReactNode }) {
  return (
    <YStack {...BUSY_A11Y} {...props}>
      {children}
    </YStack>
  );
}
