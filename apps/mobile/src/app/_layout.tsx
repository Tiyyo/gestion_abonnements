import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { AppGate } from '@/features/app-shell/components/app-gate';
import { AppShell } from '@/features/app-shell/components/app-shell';
import { NotificationRouting } from '@/features/app-shell/components/notification-routing';
import { MODAL, SHEET, STACK_OPTIONS } from '@/features/app-shell/screen-options';

// L'écran natif reste affiché jusqu'à ce que SplashOverlay prenne le relais.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <AppShell>
      <AppGate>
        <Stack screenOptions={STACK_OPTIONS}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subscriptions/new" options={SHEET} />
          <Stack.Screen name="subscriptions/edit/[id]" options={SHEET} />
          <Stack.Screen name="charges/[id]" options={MODAL} />
          <Stack.Screen name="charges/unknown" options={MODAL} />
        </Stack>
        <NotificationRouting />
      </AppGate>
    </AppShell>
  );
}
