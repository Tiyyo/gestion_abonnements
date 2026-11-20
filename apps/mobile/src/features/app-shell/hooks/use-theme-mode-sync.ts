import { useLayoutEffect } from 'react';
import type { ThemeMode } from '@/db/types';
import { applyThemeMode } from '@/theme/theme-mode';

/** Applique le réglage « Apparence » dès que les réglages sont lus, puis à chaque changement (y compris après un import). */
export function useThemeModeSync(mode: ThemeMode | undefined) {
  useLayoutEffect(() => {
    if (mode) {
      applyThemeMode(mode);
    }
  }, [mode]);
}
