import { todayIn } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { loadMonthPlan } from '@/db/repositories/plan/month-plan';

export function useMonthPlan(year: number, month: number) {
  const db = useDb();
  return useQuery({ queryKey: ['plan', year, month], queryFn: () => loadMonthPlan(db, year, month, todayIn()) });
}
