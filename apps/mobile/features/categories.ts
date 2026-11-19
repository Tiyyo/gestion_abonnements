import { useQuery } from '@tanstack/react-query';
import { useDb } from '../db/provider';

export function useCategories() {
  const db = useDb();
  return useQuery({
    queryKey: ['categories'],
    staleTime: Infinity,
    queryFn: () => db.selectFrom('category').selectAll().orderBy('sort_order').execute(),
  });
}
