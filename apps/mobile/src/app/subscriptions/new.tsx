import { todayIn } from '@abonnements/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SubscriptionForm } from '@/features/subscriptions/components/subscription-form/subscription-form';
import { useCreateSubscription } from '@/features/subscriptions/hooks/use-create-subscription';
import { newSubscriptionDefaults, toNewSubscriptionInput } from '@/features/subscriptions/subscription-form-values';

export default function NewSubscriptionScreen() {
  const params = useLocalSearchParams<{ name?: string; amount?: string; date?: string }>();
  const create = useCreateSubscription();
  const [initial] = useState(() => newSubscriptionDefaults(params, todayIn()));

  return (
    <SubscriptionForm
      mode="create"
      title="Nouvel abonnement"
      submitLabel="Enregistrer et planifier les rappels"
      defaultValues={initial}
      busy={create.isPending}
      error={create.isError ? `Enregistrement impossible : ${create.error.message}` : null}
      onCancel={() => router.back()}
      onSubmit={(values, correction, aiSuggestion, close) =>
        create.mutate({ input: toNewSubscriptionInput(values, aiSuggestion), options: { correction } }, { onSuccess: close })
      }
    />
  );
}
