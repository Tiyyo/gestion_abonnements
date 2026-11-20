import { todayIn } from '@abonnements/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type EditOptions } from '@/db/commands/edit-options';
import { updateSubscription } from '@/db/commands/update-subscription';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { type SubscriptionEdit } from '@/db/repositories/subscriptions';

export function useUpdateSubscription(id: string) {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ edit, options }: { edit: SubscriptionEdit; options?: EditOptions }) =>
      updateSubscription(db, id, edit, todayIn(), newId, options),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
