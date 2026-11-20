import { todayIn } from '@abonnements/core';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import type { HomeQuestion, HomeUnexpectedDebit } from '@/db/repositories/home/types';
import { unknownDebitParams } from '@/features/bank-sync/bank-wording';
import { useDismissDebit } from '@/features/bank-sync/hooks/use-dismiss-debit';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import { pickRescheduleDate } from '@/features/plan/pick-reschedule-date';
import { usePlanRun } from '@/features/plan/hooks/use-plan-run';
import { rescheduleFeedback, transferDoneFeedback } from '@/features/plan/plan-feedback';
import { copyAmountAndOpenRevolut } from '@/features/plan/revolut-shortcut';
import { useSubscriptionTransitionFor } from '@/features/subscriptions/hooks/use-subscription-transition-for';
import type { QuestionAnswer } from '@/features/home/types';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { useFollowUp } from '@/features/charges/hooks/use-follow-up';
import { useReviewCharge } from '@/features/charges/hooks/use-review-charge';

const onError = { onError: (error: Error) => showError('Action impossible', error.message) };

/** Actions des cartes de l'Accueil : transferts (faits tout de suite, annulables depuis le message), questions J+1, débits non prévus et essais. */
export function useHomeActions() {
  const plan = usePlanRun();
  const review = useReviewCharge();
  const followUp = useFollowUp();
  const lifecycle = useSubscriptionTransitionFor();
  const dismiss = useDismissDebit();
  const busy = plan.busy || review.isPending || followUp.isPending || lifecycle.isPending || dismiss.isPending;

  const markTransferDone = (transferId: string) => plan.run({ type: 'transfer_done', transferId }, transferDoneFeedback(transferId));

  const reschedule = (transfer: PlanTransfer) =>
    pickRescheduleDate(transfer, todayIn(), (date) =>
      plan.run({ type: 'reschedule', transferId: transfer.id, date }, rescheduleFeedback(transfer, date)),
    );

  const openRevolut = (transfer: PlanTransfer) => copyAmountAndOpenRevolut(transfer.amountCents);

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

  const reviewDebit = (debit: HomeUnexpectedDebit) => router.push({ pathname: '/charges/unknown', params: unknownDebitParams(debit) });

  const dismissDebit = (debit: HomeUnexpectedDebit) =>
    showDialog('Ignorer ce débit ?', 'Il ne sera plus signalé et ne comptera pas dans le solde estimé.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ignorer', onPress: () => dismiss.mutate(debit.transactionId, onError) },
    ]);

  return { busy, markTransferDone, reschedule, openRevolut, answer, keepTrial, cancelTrial, reviewDebit, dismissDebit };
}

export type HomeActions = ReturnType<typeof useHomeActions>;
