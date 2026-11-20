import { useCallback } from 'react';
import { useOnAppActive } from '@/features/settings/hooks/use-on-app-active';
import { useBankSync } from './use-bank-sync';

/** Relit le compte à l'ouverture de l'Accueil puis à chaque retour de l'app au premier plan. Un échec reste silencieux. */
export function useAutoBankSync(): void {
  const { mutate } = useBankSync();
  const run = useCallback(() => mutate({ force: false }), [mutate]);
  useOnAppActive(run);
}
