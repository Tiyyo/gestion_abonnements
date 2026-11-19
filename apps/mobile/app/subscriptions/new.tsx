import { addDays, todayIn } from '@abonnements/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DEFAULT_TRIAL_DAYS, SubscriptionForm } from '../../components/SubscriptionForm';
import { parseAmountCents, periodicityOf } from '../../features/subscription-form';
import { useCreateSubscription } from '../../features/subscriptions';

export default function NewSubscriptionScreen() {
  const params = useLocalSearchParams<{ name?: string; amount?: string; date?: string }>();
  const today = todayIn();
  const create = useCreateSubscription();
  const [initial] = useState(() => ({
    name: params.name ?? '',
    amount: params.amount ?? '',
    periodicity: 'month' as const,
    status: params.date ? ('active' as const) : ('trial' as const),
    firstChargeDate: params.date && params.date >= today ? params.date : params.date ? today : addDays(today, DEFAULT_TRIAL_DAYS),
    categoryId: 'cat-autre',
    iconKey: null,
    cancelUrl: '',
    marginOverrideBp: null,
    paymentMethod: 'revolut' as const,
    notes: '',
  }));

  return (
    <SubscriptionForm
      mode="create"
      title="Nouvel abonnement"
      submitLabel="Enregistrer et planifier les rappels"
      defaultValues={initial}
      busy={create.isPending}
      error={create.isError ? `Enregistrement impossible : ${create.error.message}` : null}
      onCancel={() => router.back()}
      onSubmit={(values, correction, aiSuggestion) => {
        const periodicity = periodicityOf(values.periodicity);
        create.mutate(
          {
            input: {
              name: values.name,
              amountCents: parseAmountCents(values.amount),
              periodUnit: periodicity.unit,
              periodCount: periodicity.count,
              status: values.status,
              firstChargeDate: values.firstChargeDate,
              categoryId: values.categoryId,
              iconKey: values.iconKey,
              cancelUrl: values.cancelUrl || null,
              aiSuggestion,
            },
            options: { correction },
          },
          { onSuccess: () => router.back() },
        );
      }}
    />
  );
}
