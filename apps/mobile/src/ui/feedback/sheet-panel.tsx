import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { useShadows } from '@/theme/use-shadows';
import { easeOut } from '@/ui/motion/easing';
import { SHEET_ENTER_MS, SHEET_EXIT_MS } from './sheet-timing';

/** Marge du bas figée sur la plus grande valeur reçue : sous Android, l'encart passe brièvement à 0 juste après l'ouverture. */
function useStableBottomInset() {
  const { bottom } = useSafeAreaInsets();
  const [maxBottom, setMaxBottom] = useState(bottom);
  if (bottom > maxBottom) {
    setMaxBottom(bottom);
  }
  return Math.max(maxBottom, bottom);
}

export function SheetPanel({ onDismiss, dismissLabel, children }: { onDismiss: () => void; dismissLabel: string; children: ReactNode }) {
  const bottomInset = useStableBottomInset();
  const colors = useColors();
  const shadow = useShadows();

  return (
    <YStack flex={1} justify="flex-end">
      {/*
        Voile : fermeture au toucher pour la vue, invisible pour TalkBack. Sinon il recevrait le premier focus à l'ouverture
        (« Fermer, bouton » avant le titre). Au lecteur d'écran, on ferme par les boutons du panneau ou par Retour (onRequestClose).
      */}
      <Animated.View
        style={StyleSheet.absoluteFill}
        entering={FadeIn.duration(SHEET_ENTER_MS)}
        exiting={FadeOut.duration(SHEET_EXIT_MS)}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onDismiss}
          accessibilityLabel={dismissLabel}
        />
      </Animated.View>
      <Animated.View
        style={styles.limit}
        entering={SlideInDown.duration(SHEET_ENTER_MS).easing(easeOut)}
        exiting={SlideOutDown.duration(SHEET_EXIT_MS).easing(Easing.in(Easing.cubic))}
      >
        <YStack
          bg="surface"
          px="5"
          pt="3"
          gap="4"
          shrink={1}
          style={[styles.sheet, { paddingBottom: bottomInset + 16, boxShadow: shadow.sheet }]}
          accessibilityViewIsModal
        >
          <XStack justify="center">
            <YStack w={40} h={4} rounded={2} bg="borderColor" />
          </XStack>
          {children}
        </YStack>
      </Animated.View>
    </YStack>
  );
}

const styles = StyleSheet.create({
  limit: { maxHeight: '88%' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});
