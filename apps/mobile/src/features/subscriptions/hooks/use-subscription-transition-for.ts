import { type LifecycleAction, todayIn } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { transitionSubscription } from '@/db/commands/transition-subscription';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { useInvalidateSubscriptions } from './use-invalidate-subscriptions';

/** Transition d'un abonnement choisi à l'appel (questions de l'Accueil). */
export function useSubscriptionTransitionFor() {
  const db = useDb();
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ subscriptionId, action }: { subscriptionId: string; action: LifecycleAction }) =>
      transitionSubscription(db, subscriptionId, action, todayIn(), newId),
    onSuccess: invalidate,
  });
}
