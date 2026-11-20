import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { listCategories } from '@/db/repositories/categories';

export function useCategories() {
  const db = useDb();
  return useQuery({
    queryKey: ['categories'],
    staleTime: Infinity,
    queryFn: () => listCategories(db),
  });
}
