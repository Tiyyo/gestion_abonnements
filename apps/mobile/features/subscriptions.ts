import { todayIn } from '@abonnements/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSubscription, type EditOptions, updateSubscription } from '../db/commands';
import { newId } from '../db/id';
import { useDb } from '../db/provider';
import { type NewSubscriptionInput, type SubscriptionEdit, subscriptionsRepository } from '../db/repositories/subscriptions';

export const subscriptionsKey = ['subscriptions'] as const;

export function useSubscriptions() {
  const db = useDb();
  return useQuery({ queryKey: subscriptionsKey, queryFn: () => subscriptionsRepository(db).list() });
}

export function useCreateSubscription() {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, options }: { input: NewSubscriptionInput; options?: EditOptions }) =>
      createSubscription(db, input, todayIn(), newId, options),
    onSuccess: () =>
      Promise.all(
        [subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}

export function useUpdateSubscription(id: string) {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ edit, options }: { edit: SubscriptionEdit; options?: EditOptions }) => updateSubscription(db, id, edit, todayIn(), newId, options),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
