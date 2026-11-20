import { todayIn } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { createSubscription } from '@/db/commands/create-subscription';
import { type EditOptions } from '@/db/commands/edit-options';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { type NewSubscriptionInput } from '@/db/repositories/subscriptions';
import { useInvalidateSubscriptions } from './use-invalidate-subscriptions';

export function useCreateSubscription() {
  const db = useDb();
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ input, options }: { input: NewSubscriptionInput; options?: EditOptions }) =>
      createSubscription(db, input, todayIn(), newId, options),
    onSuccess: invalidate,
  });
}
