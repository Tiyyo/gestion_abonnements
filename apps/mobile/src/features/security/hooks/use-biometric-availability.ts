import { useEffect, useState } from 'react';
import { biometricAvailable } from '@/features/security/biometrics';

/** Capteur présent et empreinte enregistrée ; null tant que la vérification n'a pas répondu. */
export function useBiometricAvailability(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    biometricAvailable().then(setAvailable);
  }, []);
  return available;
}
