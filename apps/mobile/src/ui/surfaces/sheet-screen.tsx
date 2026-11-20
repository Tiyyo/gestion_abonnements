import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/elevation';
import { easeOut } from '@/ui/motion/easing';
import { SHEET_ENTER_MS } from '@/ui/feedback/sheet-timing';

const SHEET_RADIUS = 28;
const PEEK = 52;

/**
 * Écran présenté en feuille du bas (route en `transparentModal`) : l'écran précédent reste visible, assombri, au-dessus.
 * Pas de poignée ni de fermeture par glissement ou par toucher du voile : un formulaire ne doit jamais perdre une saisie
 * (CLAUDE.md). On ferme par les boutons de l'écran.
 */
export function SheetScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim]} entering={FadeIn.duration(SHEET_ENTER_MS)} />
      <Animated.View
        style={[styles.sheet, { marginTop: insets.top + PEEK }]}
        entering={SlideInDown.duration(SHEET_ENTER_MS).easing(easeOut)}
      >
        <View style={styles.clip}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  sheet: { flex: 1, borderTopLeftRadius: SHEET_RADIUS, borderTopRightRadius: SHEET_RADIUS, boxShadow: shadow.sheet },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    backgroundColor: colors.background,
  },
});
