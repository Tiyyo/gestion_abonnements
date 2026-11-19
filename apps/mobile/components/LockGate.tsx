import * as LocalAuthentication from 'expo-local-authentication';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Lock } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { ActionButton, Body, colors, ScreenTitle } from '../ui/kit';

const RELOCK_AFTER_MS = 60_000;

export async function biometricAvailable(): Promise<boolean> {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Annuler' });
  return result.success;
}

export function LockGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [locked, setLocked] = useState(enabled);
  const [available, setAvailable] = useState<boolean | null>(null);
  const backgroundAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (await authenticate('Déverrouiller Sluis')) {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    biometricAvailable().then((ok) => {
      setAvailable(ok);
      if (!ok) {
        setLocked(false);
      }
    });
  }, []);

  useEffect(() => {
    if (enabled && available && locked) {
      unlock();
    }
  }, [enabled, available, locked, unlock]);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
      } else if (state === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) {
        backgroundAt.current = null;
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  if (!enabled || available === false || !locked) {
    return children;
  }
  return (
    <YStack flex={1} bg="primary" items="center" justify="center" gap="4" p="6">
      <Lock color={colors.onPrimary} size={40} strokeWidth={1.75} />
      <ScreenTitle color="onPrimary">Sluis</ScreenTitle>
      <Body color="onPrimary" text="center">
        L’app est verrouillée.
      </Body>
      <ActionButton size="lg" label="Déverrouiller" variant="secondary" onPress={unlock} />
    </YStack>
  );
}
