import { router, usePathname } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { peekConsentReturn, subscribeConsentInbox } from '@/features/consent/consent-inbox';

/** Ouvre l'écran de renouvellement quand la banque renvoie vers l'app ailleurs (après déverrouillage, démarrage à froid). */
export function ConsentReturnRouting() {
  const pending = useSyncExternalStore(subscribeConsentInbox, peekConsentReturn);
  const pathname = usePathname();
  useEffect(() => {
    if (pending && pathname !== '/consent') {
      router.navigate('/consent');
    }
  }, [pending, pathname]);
  return null;
}
