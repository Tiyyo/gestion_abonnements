import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { subscriptionsRepository } from '@/db/repositories/subscriptions';
import { subscriptionsKey } from '@/features/subscriptions/query-keys';

export function useSubscriptions() {
  const db = useDb();
  return useQuery({ queryKey: subscriptionsKey, queryFn: () => subscriptionsRepository(db).list() });
}
