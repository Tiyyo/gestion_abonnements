import { type ReactNode, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { YStack, type YStackProps } from 'tamagui';
import type { ThemeColors } from '@/theme/colors';
import { withAlpha } from '@/theme/contrast';
import { useColors } from '@/theme/use-colors';

// Fond aubergine des en-têtes : dégradé + lueur pêche (haut droite) + lueur violette (bas gauche), en `backgroundImage` natif (RN 0.88).
// Intensité mesurée (scripts/a11y-contrast.mjs) : à 0,14, tout texte onGlass* reste ≥ 4,5:1 au cœur de la lueur pêche,
// y compris dans un panneau en verre posé sur une carte en verre (à 0,30, la légende y tombait à 3,1:1).
// Le dégradé est le même dans les deux thèmes (il est déjà sombre) ; ses couleurs viennent quand même de la palette.
const WARM_ALPHA = 0.14;
const COOL_ALPHA = 0.4;

function backdropStyle(colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: colors.heroTo,
    backgroundImage: [
      `radial-gradient(120% 70% at 100% 0%, ${withAlpha(colors.heroGlowWarm, WARM_ALPHA)} 0%, ${withAlpha(colors.heroGlowWarm, 0)} 55%)`,
      `radial-gradient(90% 60% at 0% 100%, ${withAlpha(colors.heroGlowCool, COOL_ALPHA)} 0%, ${withAlpha(colors.heroGlowCool, 0)} 60%)`,
      `linear-gradient(160deg, ${colors.heroFrom} 0%, ${colors.heroTo} 100%)`,
    ].join(', '),
  };
}

export function Hero({ children, ...props }: YStackProps & { children: ReactNode }) {
  const colors = useColors();
  const backdrop = useMemo(() => backdropStyle(colors), [colors]);
  return (
    <YStack position="relative" overflow="hidden" {...props}>
      <View style={[StyleSheet.absoluteFill, backdrop]} pointerEvents="none" />
      {children}
    </YStack>
  );
}
