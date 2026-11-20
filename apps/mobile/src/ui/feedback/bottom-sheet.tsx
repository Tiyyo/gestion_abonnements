import { type ReactNode, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Heading } from '@/ui/text/typography';
import { SheetPanel } from './sheet-panel';
import { SHEET_EXIT_MS } from './sheet-timing';

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

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
});
