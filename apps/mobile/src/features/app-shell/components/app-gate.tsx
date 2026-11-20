import type { ReactNode } from 'react';
import { Spinner } from 'tamagui';
import { useRescheduleOnForeground } from '@/features/app-shell/hooks/use-reschedule-on-foreground';
import { LockGate } from '@/features/security/components/lock-gate';
import { Onboarding } from '@/features/settings/components/onboarding';
import { useSettings } from '@/features/settings/hooks/use-settings';

/** Premier lancement puis verrouillage biométrique (s'il est activé) avant l'app elle-même. */
export function AppGate({ children }: { children: ReactNode }) {
  const settings = useSettings();
  useRescheduleOnForeground();

  if (!settings.data) {
    return <Spinner flex={1} color="primary" />;
  }
  if (settings.data.onboarding_done === 0) {
    return <Onboarding />;
  }
  return <LockGate enabled={settings.data.biometric_lock === 1}>{children}</LockGate>;
}
