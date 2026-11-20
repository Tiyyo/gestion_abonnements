import { type LifecycleAction, todayIn } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { useInvalidateSubscriptions } from './use-invalidate-subscriptions';

export function useSubscriptionTransition(id: string) {
  const db = useDb();
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: (action: LifecycleAction) => transitionSubscription(db, id, action, todayIn(), newId),
    onSuccess: invalidate,
  });
}
