import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';
import { PILL_HEIGHT } from './tab-bar-metrics';

// Libellé plafonné à 120 % de la police système : la capsule a une hauteur fixe (50 px) et quatre onglets se partagent
// la largeur ; au-delà, « Abonnements » serait tronqué et l'icône rognée. Le nom complet reste annoncé par TabPressTargets.
const TAB_LABEL_MAX_SCALE = 1.2;

/** Dessin d'un onglet (icône + libellé), masqué pour TalkBack : seules les zones de TabPressTargets sont lues. */
export function TabContent({ icon, label, color }: { icon: ReactNode; label: string; color: 'onPrimary' | 'colorMuted' }) {
  return (
    <YStack
      flex={1}
      h={PILL_HEIGHT}
      items="center"
      justify="center"
      gap="0.5"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {icon}
      <Text fontSize={11} fontWeight="600" color={color} numberOfLines={1} maxFontSizeMultiplier={TAB_LABEL_MAX_SCALE}>
        {label}
      </Text>
    </YStack>
  );
}
