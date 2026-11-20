import { todayIn } from '@abonnements/core';
import { useLocalSearchParams } from 'expo-router';
import { Spinner } from 'tamagui';
import { ChargeNotFound } from '@/features/charges/components/charge-not-found';
import { ReviewChargeForm } from '@/features/charges/components/review-charge-form';
import { useChargeToReview } from '@/features/charges/hooks/use-charge-to-review';

export default function ReviewChargeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const charge = useChargeToReview(id);

  if (charge.isPending) {
    return <Spinner flex={1} color="primary" />;
  }
  if (!charge.data) {
    return <ChargeNotFound />;
  }
  // La saisie part des valeurs du prélèvement : la clé remonte le formulaire si le prélèvement change.
  return <ReviewChargeForm key={charge.data.id} row={charge.data} today={todayIn()} />;
}
