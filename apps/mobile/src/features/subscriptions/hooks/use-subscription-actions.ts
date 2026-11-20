import type { LifecycleAction } from '@abonnements/core';
import { router } from 'expo-router';
import { defaultStopDate, stopToastLabel } from '@/features/subscriptions/detail-labels';
import { openDatePicker } from '@/features/subscriptions/open-date-picker';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { showToast } from '@/ui/feedback/show-toast';
import { useArchiveSubscription } from './use-archive-subscription';
import { useSubscriptionTransition } from './use-subscription-transition';

function confirm(title: string, message: string, label: string, onConfirm: () => void) {
  showDialog(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: label, style: 'destructive', onPress: onConfirm },
  ]);
}

const fail = (error: Error) => showError('Action impossible', error.message);

/**
 * Actions de la fiche : transitions du cycle de vie, avec confirmation pour les destructrices et choix de date si besoin.
 * L'arrêt se défait par `undo_stop` : il est annoncé par un message « Annuler » plutôt que confirmé.
 */
export function useSubscriptionActions(id: string, today: string) {
  const transition = useSubscriptionTransition(id);
  const archive = useArchiveSubscription(id);
  const run = (action: LifecycleAction) => transition.mutate(action, { onError: fail });
  const stopOn = (date: string) => {
    transition
      .mutateAsync({ type: 'stop', periodEndDate: date })
      .then(() =>
        showToast(stopToastLabel(date), {
          action: { label: 'Annuler', onPress: () => void transition.mutateAsync({ type: 'undo_stop' }).catch(fail) },
        }),
      )
      .catch(fail);
  };

  return {
    busy: transition.isPending || archive.isPending,
    keepTrial: () => run({ type: 'keep_trial' }),
    cancelTrial: () =>
      confirm('Résilier l’essai ?', 'Le prélèvement prévu sera supprimé. Pense à résilier aussi chez le marchand.', 'Résilier', () =>
        run({ type: 'cancel_trial' }),
      ),
    confirmCancelDone: () => run({ type: 'confirm_cancel_done' }),
    undoStop: () => run({ type: 'undo_stop' }),
    reactivate: () => openDatePicker(today, today, (date) => run({ type: 'reactivate', nextChargeDate: date })),
    remove: () =>
      confirm(
        'Supprimer l’abonnement ?',
        'Il disparaîtra des listes et des statistiques. Son historique reste dans l’export.',
        'Supprimer',
        () => archive.mutate(undefined, { onSuccess: () => router.back() }),
      ),
    stop: (nextChargeDate: string) => openDatePicker(defaultStopDate(nextChargeDate, today), today, stopOn),
  };
}

export type SubscriptionActions = ReturnType<typeof useSubscriptionActions>;
