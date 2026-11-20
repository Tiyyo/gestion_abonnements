import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { isSubscriptionFormDirty } from '@/features/subscriptions/subscription-form-values';
import { useDiscardGuard } from '@/ui/navigation/use-discard-guard';

const LOSS = {
  create: 'L’abonnement que tu as saisi ne sera pas enregistré.',
  edit: 'Tes modifications ne seront pas enregistrées.',
} as const;

/**
 * Garde de saisie du formulaire d'abonnement. Saisie en cours = valeurs différentes de celles du départ :
 * `formState.isDirty` ne voit pas les `setValue` (catégorie, rythme, date, logo, marge), on compare donc
 * toutes les valeurs, y compris l'adresse de résiliation et les notes.
 */
export function useFormGuard(control: Control<SubscriptionFormValues>, defaultValues: SubscriptionFormValues, mode: 'create' | 'edit') {
  const [initialValues] = useState(defaultValues);
  const values = useWatch({ control });
  return useDiscardGuard(isSubscriptionFormDirty(initialValues, values), LOSS[mode]);
}
