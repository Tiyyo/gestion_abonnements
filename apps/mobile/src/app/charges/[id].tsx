import { todayIn } from '@abonnements/core';
import { router, useLocalSearchParams } from 'expo-router';
import { Spinner } from 'tamagui';
import { ReviewChargeForm } from '@/features/charges/components/review-charge-form';
import { useChargeToReview } from '@/features/charges/hooks/use-charge-to-review';
import { EmptyState } from '@/ui/feedback/empty-state';
import { SheetHeader } from '@/ui/navigation/sheet-header';
import { SheetScreen } from '@/ui/surfaces/sheet-screen';

export default function ReviewChargeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const charge = useChargeToReview(id);

  // La feuille reste montée pendant le chargement : elle ne glisse qu'une fois, seul son contenu change.
  return (
    <SheetScreen>
      <SheetHeader title="Prélèvement à vérifier" onCancel={() => router.back()} />
      {charge.isPending ? (
        <Spinner mt="8" color="primaryText" />
      ) : charge.data ? (
        // La saisie part des valeurs du prélèvement : la clé remonte le formulaire si le prélèvement change.
        <ReviewChargeForm key={charge.data.id} row={charge.data} today={todayIn()} />
      ) : (
        <EmptyState message="Ce prélèvement n’existe plus : le plan a été recalculé depuis. Touche Annuler pour revenir." />
      )}
    </SheetScreen>
  );
}
