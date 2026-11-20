import { todayIn } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { archiveSubscription } from '@/db/commands/archive-subscription';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { useInvalidateSubscriptions } from './use-invalidate-subscriptions';

export function useArchiveSubscription(id: string) {
  const db = useDb();
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: () => archiveSubscription(db, id, todayIn(), newId),
    onSuccess: invalidate,
  });
}
