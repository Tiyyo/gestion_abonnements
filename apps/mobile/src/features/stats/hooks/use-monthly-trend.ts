import { todayIn } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { loadMonthlyTrend } from '@/db/repositories/stats-trend';

/** Clé sous `['stats']` : toute invalidation des statistiques rafraîchit aussi la tendance. */
export function useMonthlyTrend() {
  const db = useDb();
  return useQuery({ queryKey: ['stats', 'trend'], queryFn: () => loadMonthlyTrend(db, todayIn()) });
}
