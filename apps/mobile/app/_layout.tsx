import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Spinner, TamaguiProvider, Text, YStack } from 'tamagui';
import { LockGate } from '../components/LockGate';
import { Onboarding } from '../components/Onboarding';
import { DbProvider, useDbInit } from '../db/provider';
import { useSettings } from '../features/settings';
import { attachNotificationDb, requestReschedule } from '../notifications/scheduler';
import config from '../tamagui.config';
import { SplashOverlay } from '../ui/brand/SplashOverlay';
import { DialogHost } from '../ui/dialog';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const MODAL = { presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false } as const;

function NotificationRouting() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') {
      router.navigate(url as never);
    }
  }, [response]);
  return null;
}

function AppContent() {
  const settings = useSettings();
  useEffect(() => {
    requestReschedule(0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        requestReschedule();
      }
    });
    return () => subscription.remove();
  }, []);

  if (!settings.data) {
    return <Spinner flex={1} color="primary" />;
  }
  if (settings.data.onboarding_done === 0) {
    return <Onboarding />;
  }
  return (
    <LockGate enabled={settings.data.biometric_lock === 1}>
      <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscriptions/new" options={MODAL} />
        <Stack.Screen name="subscriptions/edit/[id]" options={MODAL} />
        <Stack.Screen name="charges/[id]" options={MODAL} />
        <Stack.Screen name="charges/unknown" options={MODAL} />
      </Stack>
      <NotificationRouting />
    </LockGate>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ mutationCache: new MutationCache({ onSuccess: () => requestReschedule() }) }));
  const db = useDbInit();
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const fontsSettled = fontsLoaded || fontError !== null;
  const [splashDone, setSplashDone] = useState(false);
  const hideSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (db.status === 'ready') {
      attachNotificationDb(db.db);
    }
  }, [db]);

  return (
    <TamaguiProvider config={config} defaultTheme="light">
      {db.status === 'ready' && fontsSettled ? (
        <DbProvider db={db.db}>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </DbProvider>
      ) : (
        <YStack flex={1} items="center" justify="center" backgroundColor="background" gap="4">
          {db.status === 'error' ? (
            <Text color="dangerText">Base de données indisponible : {db.error.message}</Text>
          ) : (
            <Spinner size="large" color="primary" />
          )}
        </YStack>
      )}
      <StatusBar style="dark" />
      <DialogHost />
      {splashDone ? null : <SplashOverlay ready={db.status !== 'loading' && fontsSettled} onDone={hideSplash} />}
    </TamaguiProvider>
  );
}
