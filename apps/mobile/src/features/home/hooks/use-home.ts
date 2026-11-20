import { todayIn } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { loadHome } from '@/db/repositories/home/load-home';

export function useHome() {
  const db = useDb();
  return useQuery({ queryKey: ['home'], queryFn: () => loadHome(db, todayIn()) });
}
