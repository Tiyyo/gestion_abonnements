import { todayIn } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '../db/provider';
import { loadStats } from '../db/repositories/stats';

export function useStats() {
  const db = useDb();
  return useQuery({ queryKey: ['stats'], queryFn: () => loadStats(db, todayIn()) });
}
