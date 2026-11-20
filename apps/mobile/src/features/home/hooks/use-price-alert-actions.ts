import { todayIn } from '@abonnements/core';
import { router } from 'expo-router';
import type { HomePriceAlert } from '@/db/repositories/home/types';
import { defaultStopDate, stopToastLabel } from '@/features/subscriptions/detail-labels';
import { useSubscriptionTransitionFor } from '@/features/subscriptions/hooks/use-subscription-transition-for';
import { openDatePicker } from '@/features/subscriptions/open-date-picker';
import { showError } from '@/ui/feedback/show-dialog';
import { showToast } from '@/ui/feedback/show-toast';
import { useDismissPriceAlert } from './use-dismiss-price-alert';

const fail = (error: Error) => showError('Action impossible', error.message);

/** Actions de la carte « Hausse de prix » de l'Accueil : voir la fiche, masquer l'alerte, arrêter l'abonnement. */
export function usePriceAlertActions() {
  const lifecycle = useSubscriptionTransitionFor();
  const dismiss = useDismissPriceAlert();

  const openSubscription = (subscriptionId: string) => router.push(`/subscriptions/${subscriptionId}`);

  const dismissPriceAlert = (alert: HomePriceAlert) => dismiss.mutate(alert.eventId, { onError: fail });

  // Même parcours que « Arrêter » sur la fiche : choix de la fin de période, passage en « à résilier », message « Annuler ».
  const stopAfterIncrease = (alert: HomePriceAlert) => {
    const today = todayIn();
    const { subscriptionId } = alert;
    openDatePicker(defaultStopDate(alert.nextChargeDate, today), today, (date) => {
      lifecycle
        .mutateAsync({ subscriptionId, action: { type: 'stop', periodEndDate: date } })
        .then(() =>
          showToast(stopToastLabel(date), {
            action: {
              label: 'Annuler',
              onPress: () => void lifecycle.mutateAsync({ subscriptionId, action: { type: 'undo_stop' } }).catch(fail),
            },
          }),
        )
        .catch(fail);
    });
  };

  return { busy: lifecycle.isPending || dismiss.isPending, openSubscription, dismissPriceAlert, stopAfterIncrease };
}
