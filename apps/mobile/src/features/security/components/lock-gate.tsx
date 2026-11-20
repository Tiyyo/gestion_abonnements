import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';
import { Body, ScreenTitle } from '@/ui/text/typography';
import { colors } from '@/theme/colors';
import { authenticate } from '@/features/security/biometrics';
import { useBiometricAvailability } from '@/features/security/hooks/use-biometric-availability';
import { useRelockOnResume } from '@/features/security/hooks/use-relock-on-resume';

export function LockGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [locked, setLocked] = useState(enabled);
  const [wasEnabled, setWasEnabled] = useState(enabled);
  const available = useBiometricAvailability();

  // Verrou coupé : on repart déverrouillé, pour ne pas bloquer l'app au moment où on le réactive.
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled);
    if (!enabled) {
      setLocked(false);
    }
  }

  const relock = useCallback(() => setLocked(true), []);
  useRelockOnResume(enabled, relock);

  const unlock = useCallback(
    () =>
      authenticate('Déverrouiller Sluis').then((ok) => {
        if (ok) {
          setLocked(false);
        }
      }),
    [],
  );

  // Demande l'empreinte d'elle-même à l'ouverture et à chaque reverrouillage.
  useEffect(() => {
    if (enabled && available && locked) {
      unlock();
    }
  }, [enabled, available, locked, unlock]);

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
