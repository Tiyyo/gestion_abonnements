import { useQueryClient } from '@tanstack/react-query';
import { subscriptionsKey } from '@/features/subscriptions/query-keys';

const ALL_KEYS = [subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']];

export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => Promise.all(ALL_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
