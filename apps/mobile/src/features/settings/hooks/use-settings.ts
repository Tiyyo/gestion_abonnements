import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { settingsRepository } from '@/db/repositories/settings';

const settingsKey = ['settings'] as const;

export function useSettings() {
  const db = useDb();
  return useQuery({ queryKey: settingsKey, queryFn: () => settingsRepository(db).get() });
}
