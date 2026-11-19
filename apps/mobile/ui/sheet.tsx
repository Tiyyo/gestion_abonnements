import { Check } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { Body, colors, Heading } from './kit';
import { shadow } from './elevation';
import { easeOut, haptic } from './motion';

export const SHEET_ENTER_MS = 260;
export const SHEET_EXIT_MS = 200;

export function SheetPanel({ onDismiss, dismissLabel, children }: { onDismiss: () => void; dismissLabel: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const bottomInset = useRef(0);
  bottomInset.current = Math.max(bottomInset.current, insets.bottom);

  return (
    <YStack flex={1} justify="flex-end">
      <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(SHEET_ENTER_MS)} exiting={FadeOut.duration(SHEET_EXIT_MS)}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onDismiss}
          accessibilityRole="button"
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
          style={[styles.sheet, { paddingBottom: bottomInset.current + 16 }]}
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

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) {
    setMounted(true);
  }
  useEffect(() => {
    if (open || !mounted) {
      return;
    }
    const timer = setTimeout(() => setMounted(false), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  return (
    <Modal visible={open || mounted} transparent animationType="none" navigationBarTranslucent onRequestClose={onClose}>
      <SafeAreaProvider>
        {open ? (
          <SheetPanel onDismiss={onClose} dismissLabel="Fermer">
            <Heading accessibilityRole="header">{title}</Heading>
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </SheetPanel>
        ) : null}
      </SafeAreaProvider>
    </Modal>
  );
}

export function SheetOption({
  label,
  hint,
  selected,
  leading,
  last,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  leading?: ReactNode;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <XStack
      minH={56}
      py="3"
      gap="3"
      items="center"
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      opacity="1 press:0.6"
      transition="fast"
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      {leading}
      <YStack flex={1} gap="0.5">
        <Body fontWeight={selected ? '600' : '400'}>{label}</Body>
        {hint ? (
          <Body fontSize={13} color="colorMuted">
            {hint}
          </Body>
        ) : null}
      </YStack>
      {selected ? <Check color={colors.primary} size={22} strokeWidth={2.5} /> : null}
    </XStack>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim },
  limit: { maxHeight: '88%' },
  scroll: { flexGrow: 0 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: shadow.sheet,
  },
});
