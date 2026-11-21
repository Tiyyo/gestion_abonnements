import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { AppGate } from '@/features/app-shell/components/app-gate';
import { AppShell } from '@/features/app-shell/components/app-shell';
import { NotificationRouting } from '@/features/app-shell/components/notification-routing';
import { SHEET, STACK_OPTIONS } from '@/features/app-shell/screen-options';
import { ConsentReturnRouting } from '@/features/consent/components/consent-return-routing';
import { startConsentInbox } from '@/features/consent/consent-inbox';

// L'écran natif reste affiché jusqu'à ce que SplashOverlay prenne le relais.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Le retour de la banque peut arriver app verrouillée ou à froid : il est capté dès le chargement (features/consent).
startConsentInbox();

export default function RootLayout() {
  return (
    <AppShell>
      <AppGate>
        <Stack screenOptions={STACK_OPTIONS}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subscriptions/new" options={SHEET} />
          <Stack.Screen name="subscriptions/edit/[id]" options={SHEET} />
          <Stack.Screen name="charges/[id]" options={SHEET} />
          <Stack.Screen name="charges/unknown" options={SHEET} />
          <Stack.Screen name="consent" options={SHEET} dangerouslySingular />
        </Stack>
        <NotificationRouting />
        <ConsentReturnRouting />
      </AppGate>
    </AppShell>
  );
}
