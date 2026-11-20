import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { authenticate } from '@/features/security/biometrics';
import { useBiometricAvailability } from '@/features/security/hooks/use-biometric-availability';
import { useRelockOnResume } from '@/features/security/hooks/use-relock-on-resume';
import { LockScreen } from './lock-screen';

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
  return <LockScreen onUnlock={unlock} />;
}
