import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useCallback, useState } from 'react';
import { TamaguiProvider } from 'tamagui';
import { BootScreen } from './boot-screen';
import { NavigationTheme } from './navigation-theme';
import { useAppBoot } from '@/features/app-shell/hooks/use-app-boot';
import { createQueryClient } from '@/features/app-shell/query-client';
import { DbProvider } from '@/db/provider';
import { config } from '@/theme/tamagui.config';
import { useAppScheme } from '@/theme/use-app-scheme';
import { SplashOverlay } from '@/ui/brand/splash-overlay';
import { DialogHost } from '@/ui/feedback/dialog-host';
import { ToastHost } from '@/ui/feedback/toast-host';
import { AppStatusBar } from '@/ui/navigation/app-status-bar';

/**
 * Fournisseurs de l'app (Tamagui, base, TanStack Query) : le contenu n'est monté qu'une fois la base et les polices prêtes.
 * L'écran de démarrage animé (SplashOverlay) prend le relais de l'écran natif et s'efface de lui-même.
 * Thème : celui du système, ou celui du réglage « Apparence » une fois les réglages lus (`useThemeModeSync` dans AppGate).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const { db, fontsSettled } = useAppBoot();
  const scheme = useAppScheme();
  const [splashDone, setSplashDone] = useState(false);
  const hideSplash = useCallback(() => setSplashDone(true), []);

  return (
    <TamaguiProvider config={config} defaultTheme={scheme}>
      {db.status === 'ready' && fontsSettled ? (
        <DbProvider db={db.db}>
          <QueryClientProvider client={queryClient}>
            <NavigationTheme>{children}</NavigationTheme>
          </QueryClientProvider>
        </DbProvider>
      ) : (
        <BootScreen error={db.status === 'error' ? db.error : null} />
      )}
      <AppStatusBar />
      <ToastHost />
      <DialogHost />
      {splashDone ? null : <SplashOverlay ready={db.status !== 'loading' && fontsSettled} onDone={hideSplash} />}
    </TamaguiProvider>
  );
}
