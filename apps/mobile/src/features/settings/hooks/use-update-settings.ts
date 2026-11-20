import { todayIn } from '@abonnements/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { settingsRepository } from '@/db/repositories/settings';
import type { SettingsUpdate } from '@/db/types';

export function useUpdateSettings() {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsUpdate) => settingsRepository(db).update(patch, todayIn(), newId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
