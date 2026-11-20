import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { YStack, type YStackProps } from 'tamagui';
import { colors } from '@/theme/colors';

// Fond aubergine des en-têtes : dégradé + lueur pêche (haut droite) + lueur violette (bas gauche), en `backgroundImage` natif (RN 0.88).
// Intensités mesurées : le blanc reste au-dessus de 5:1 sous la lueur pêche, même à travers un bouton en verre.
const WARM = 'rgba(246, 213, 196, 0.30)';
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
