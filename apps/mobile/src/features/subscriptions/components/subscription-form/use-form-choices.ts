import type { PaymentMethod } from '@abonnements/core';
import type { UseFormSetValue } from 'react-hook-form';
import type { PeriodicityKey, SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { useFormSheet } from './use-form-sheet';

/**
 * Choix faits dans le panneau du bas : chaque choix referme le panneau. Changer la catégorie ou le logo
 * à la main marque une correction (`onClassify`), mémorisée pour les suggestions suivantes.
 */
export function useFormChoices(setValue: UseFormSetValue<SubscriptionFormValues>, onClassify: () => void) {
  const sheet = useFormSheet();
  return {
    sheet,
    category: (id: string) => {
      setValue('categoryId', id);
      onClassify();
      sheet.close();
    },
    icon: (key: string | null) => {
      setValue('iconKey', key);
      onClassify();
      sheet.close();
    },
    periodicity: (key: PeriodicityKey) => {
      setValue('periodicity', key);
      sheet.close();
    },
    payment: (method: PaymentMethod) => {
      setValue('paymentMethod', method);
      sheet.close();
    },
    margin: (marginBp: number | null) => setValue('marginOverrideBp', marginBp),
  };
}
