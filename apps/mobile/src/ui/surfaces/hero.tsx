import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { YStack, type YStackProps } from 'tamagui';
import { colors } from '@/theme/colors';

// Fond aubergine des en-têtes : dégradé + lueur pêche (haut droite) + lueur violette (bas gauche), en `backgroundImage` natif (RN 0.88).
// Intensité mesurée (scripts/a11y-contrast.mjs) : à 0,14, tout texte onGlass* reste ≥ 4,5:1 au cœur de la lueur pêche,
// y compris dans un panneau en verre posé sur une carte en verre (à 0,30, la légende y tombait à 3,1:1).
const WARM = 'rgba(246, 213, 196, 0.14)';
const WARM_CLEAR = 'rgba(246, 213, 196, 0)';
const COOL = 'rgba(156, 72, 160, 0.40)';
const COOL_CLEAR = 'rgba(156, 72, 160, 0)';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.heroTo,
    backgroundImage: [
      `radial-gradient(120% 70% at 100% 0%, ${WARM} 0%, ${WARM_CLEAR} 55%)`,
      `radial-gradient(90% 60% at 0% 100%, ${COOL} 0%, ${COOL_CLEAR} 60%)`,
      `linear-gradient(160deg, ${colors.heroFrom} 0%, ${colors.heroTo} 100%)`,
    ].join(', '),
  },
});

export function Hero({ children, ...props }: YStackProps & { children: ReactNode }) {
  return (
    <YStack position="relative" overflow="hidden" {...props}>
      <View style={styles.backdrop} pointerEvents="none" />
      {children}
    </YStack>
  );
}
