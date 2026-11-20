import { todayIn } from '@abonnements/core';
import { router } from 'expo-router';
import { useDb } from '@/db/provider';
import { fundedFutureCharges } from '@/db/repositories/charges';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { type Correction, fundedChargesWarning, toSubscriptionEdit, touchesPlan } from '@/features/subscriptions/subscription-form-values';
import { showDialog } from '@/ui/feedback/show-dialog';
import { useUpdateSubscription } from './use-update-subscription';

/**
 * Enregistre une modification ; si elle touche au plan alors que des prélèvements à venir sont déjà
 * alimentés, prévient d'abord que ceux-là ne changeront pas.
 */
export function useSaveSubscriptionEdit(row: SubscriptionRow | undefined, id: string) {
  const db = useDb();
  const update = useUpdateSubscription(id);

  const save = async (values: SubscriptionFormValues, correction: Correction | null) => {
    if (!row) {
      return;
    }
    const edit = toSubscriptionEdit(values);
    const commit = () => update.mutate({ edit, options: { correction } }, { onSuccess: () => router.back() });
    const funded = touchesPlan(edit, row) ? await fundedFutureCharges(db, id, todayIn()) : [];
    if (funded.length === 0) {
      commit();
      return;
    }
    showDialog('Transfert déjà fait', fundedChargesWarning(funded), [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Enregistrer', onPress: commit },
    ]);
  };

  return { save, update };
}
