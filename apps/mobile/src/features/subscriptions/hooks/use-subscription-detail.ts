import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { loadSubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { subscriptionsKey } from '@/features/subscriptions/query-keys';

export function useSubscriptionDetail(id: string) {
  const db = useDb();
  return useQuery({
    queryKey: [...subscriptionsKey, id, 'detail'],
    queryFn: () => loadSubscriptionDetail(db, id),
  });
}
