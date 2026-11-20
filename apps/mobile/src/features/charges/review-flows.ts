import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import type { FollowUpInput } from '@/features/charges/hooks/use-follow-up';
import { retryShortfallCents } from '@/features/charges/debit-input';
import type { ReviewContext } from '@/features/charges/types';
import { showDialog } from '@/ui/feedback/show-dialog';

// Enchaînements du rapprochement : chaque réponse peut ouvrir une question de suivi avant de fermer l'écran.

function followUpThenBack({ followUp, fail }: ReviewContext, input: FollowUpInput) {
  followUp.mutate(input, { onSuccess: () => router.back(), onError: fail });
}

function giveUp({ row, review, fail }: ReviewContext) {
  review.mutate({ chargeId: row.id, answer: { kind: 'failed', choice: 'give_up' } }, { onSuccess: () => router.back(), onError: fail });
}

function askTrialDecision(ctx: ReviewContext) {
  const subscriptionId = ctx.row.subscription_id;
  showDialog(
    `Garder ${ctx.row.name} ?`,
    'Le prélèvement est passé. Tu peux garder l’abonnement, ou le résilier pour la prochaine échéance.',
    [
      { text: 'Résilier', style: 'destructive', onPress: () => followUpThenBack(ctx, { type: 'cancel', subscriptionId }) },
      { text: 'Garder', onPress: () => followUpThenBack(ctx, { type: 'keep', subscriptionId }) },
    ],
    { tone: 'question', cancelable: false },
  );
}

function proposeAmountUpdate(ctx: ReviewContext, amountCents: number) {
  showDialog(
    'Le prix a changé',
    `Mettre à jour le montant de ${ctx.row.name} à ${formatEuros(amountCents)} pour les prochains prélèvements ?`,
    [
      { text: 'Non', style: 'cancel', onPress: () => router.back() },
      {
        text: 'Mettre à jour',
        onPress: () => followUpThenBack(ctx, { type: 'amount', subscriptionId: ctx.row.subscription_id, amountCents }),
      },
    ],
  );
}

/** « Il est passé » : enregistre le débit, puis propose la mise à jour du prix ou la décision sur l'essai. */
export function submitPaid(ctx: ReviewContext, amountCents: number, date: string) {
  ctx.review.mutate(
    { chargeId: ctx.row.id, answer: { kind: 'paid', amountCents, date } },
    {
      onError: ctx.fail,
      onSuccess: (result) => {
        if (result.proposeAmountUpdate && !result.trialDecision) {
          proposeAmountUpdate(ctx, amountCents);
        } else if (result.trialDecision) {
          askTrialDecision(ctx);
        } else {
          router.back();
        }
      },
    },
  );
}

/** Le marchand va retenter : si le prix a augmenté, demande de transférer la différence depuis le coffre. */
function merchantWillRetry(ctx: ReviewContext, newAmountCents: number) {
  const { row } = ctx;
  ctx.review.mutate(
    { chargeId: row.id, answer: { kind: 'failed', choice: 'merchant_will_retry' } },
    {
      onError: ctx.fail,
      onSuccess: () => {
        const shortfall = retryShortfallCents(newAmountCents, row.funded_amount_cents);
        if (shortfall === null) {
          router.back();
          return;
        }
        showDialog(
          'Le prix a augmenté',
          `Le compte a reçu ${formatEuros(row.funded_amount_cents)}, il manque ${formatEuros(shortfall)}. Transfère cette différence du coffre maintenant.`,
          [
            { text: 'Plus tard', style: 'cancel', onPress: () => router.back() },
            {
              text: 'C’est fait',
              onPress: () => followUpThenBack(ctx, { type: 'corrective', chargeId: row.id, amountCents: newAmountCents }),
            },
          ],
          { tone: 'warn' },
        );
      },
    },
  );
}

/** « Il a échoué » : un prélèvement non financé est abandonné d'office ; sinon on demande si le marchand va retenter. */
export function submitFailed(ctx: ReviewContext, newAmountCents: number) {
  if (ctx.row.status === 'unfunded') {
    giveUp(ctx);
    return;
  }
  showDialog('Prélèvement échoué', 'L’argent transféré est resté sur le compte.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Le marchand va retenter', onPress: () => merchantWillRetry(ctx, newAmountCents) },
    { text: 'Abandonner', style: 'destructive', onPress: () => giveUp(ctx) },
  ]);
}
