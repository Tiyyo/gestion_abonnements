import { useQueryClient } from '@tanstack/react-query';
import { subscriptionRelatedKeys } from '@/features/subscriptions/query-keys';

export function useInvalidateSubscriptions() {
  const queryClient = useQueryClient();
  return () => Promise.all(subscriptionRelatedKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
