import { showError } from '@/ui/feedback/show-dialog';
import type { SaveSetting } from '@/features/settings/types';
import { useUpdateSettings } from './use-update-settings';

/** Enregistre un réglage et signale l'échec, sans bloquer l'écran. */
export function useSaveSetting(): SaveSetting {
  const update = useUpdateSettings();
  return (patch) => update.mutate(patch, { onError: (error) => showError('Réglage non enregistré', error.message) });
}
