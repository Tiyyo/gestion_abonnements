import { todayIn } from '@abonnements/core';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import type { HomeQuestion } from '@/db/repositories/home/types';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import { pickRescheduleDate } from '@/features/plan/pick-reschedule-date';
import { usePlanRun } from '@/features/plan/hooks/use-plan-run';
import { rescheduleFeedback, transferDoneFeedback } from '@/features/plan/plan-feedback';
import { useSubscriptionTransitionFor } from '@/features/subscriptions/hooks/use-subscription-transition-for';
import type { QuestionAnswer } from '@/features/home/types';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { useFollowUp } from '@/features/charges/hooks/use-follow-up';
import { useReviewCharge } from '@/features/charges/hooks/use-review-charge';

const onError = { onError: (error: Error) => showError('Action impossible', error.message) };

/** Actions des cartes de l'Accueil : transferts (faits tout de suite, annulables depuis le message), questions J+1 et essais. */
export function useHomeActions() {
  const plan = usePlanRun();
  const review = useReviewCharge();
  const followUp = useFollowUp();
  const lifecycle = useSubscriptionTransitionFor();
  const busy = plan.busy || review.isPending || followUp.isPending || lifecycle.isPending;

  const markTransferDone = (transferId: string) => plan.run({ type: 'transfer_done', transferId }, transferDoneFeedback(transferId));

  const reschedule = (transfer: PlanTransfer) =>
    pickRescheduleDate(transfer, todayIn(), (date) =>
      plan.run({ type: 'reschedule', transferId: transfer.id, date }, rescheduleFeedback(transfer, date)),
    );

  const answer = (question: HomeQuestion, kind: QuestionAnswer) => {
    if (kind === 'open' && question.cancelUrl) {
      Linking.openURL(question.cancelUrl);
    } else if (kind === 'confirm') {
      followUp.mutate({ type: 'confirm_cancel', subscriptionId: question.subscriptionId }, onError);
    } else if (kind === 'paid' && question.chargeId) {
      router.push(`/charges/${question.chargeId}`);
    } else if (kind === 'failed' && question.chargeId) {
      review.mutate({ chargeId: question.chargeId, answer: { kind: 'failed', choice: 'give_up' } }, onError);
    }
  };

  const keepTrial = (trial: PlanTrial) =>
    lifecycle.mutate({ subscriptionId: trial.subscriptionId, action: { type: 'keep_trial' } }, onError);

  const cancelTrial = (trial: PlanTrial) =>
    showDialog(`Résilier ${trial.name} ?`, 'Le prélèvement prévu sera supprimé. Pense à résilier aussi chez le marchand.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Résilier',
        style: 'destructive',
        onPress: () => lifecycle.mutate({ subscriptionId: trial.subscriptionId, action: { type: 'cancel_trial' } }, onError),
      },
    ]);

  return { busy, markTransferDone, reschedule, answer, keepTrial, cancelTrial };
}

export type HomeActions = ReturnType<typeof useHomeActions>;
