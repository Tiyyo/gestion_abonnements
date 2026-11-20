import type { PlanAction } from '@/features/plan/plan-action';
import type { PlanFeedback } from '@/features/plan/plan-feedback';
import { showError } from '@/ui/feedback/show-dialog';
import { showToast } from '@/ui/feedback/show-toast';
import { usePlanAction } from './use-plan-action';

const fail = (error: Error) => showError('Action impossible', error.message);

/**
 * Lance une action du Plan. Avec un `feedback`, l'action est faite tout de suite puis annoncée par un message
 * dont le bouton « Annuler » lance la commande inverse (les requêtes sont invalidées par `usePlanAction`).
 * `mutateAsync` : l'annulation reste possible même si l'écran d'origine a été quitté entre-temps.
 */
export function usePlanRun() {
  const action = usePlanAction();

  const run = (input: PlanAction, feedback?: PlanFeedback | null) => {
    action
      .mutateAsync(input)
      .then((result) => {
        if (!feedback) {
          return;
        }
        const inverse = feedback.undo(result);
        showToast(feedback.message, {
          action: inverse ? { label: 'Annuler', onPress: () => void action.mutateAsync(inverse).catch(fail) } : undefined,
        });
      })
      .catch(fail);
  };

  return { run, busy: action.isPending };
}
