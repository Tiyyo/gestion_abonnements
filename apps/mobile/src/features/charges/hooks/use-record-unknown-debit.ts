import { formatEuros } from '@abonnements/core';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { classifyDebit } from '@/db/reconcile/classify-debit';
import { recordUnknownDebit } from '@/db/reconcile/record-unknown-debit';
import { unknownDebitLabel } from '@/features/charges/debit-input';
import { useReviewCharge } from './use-review-charge';
import { parseAmountCents } from '@/features/subscriptions/subscription-form-schema';
import { formatDayMonth } from '@/lib/format';
import { requestReschedule } from '@/notifications/scheduler';
import { showDialog, showError } from '@/ui/feedback/show-dialog';

/**
 * Enregistre un débit inconnu : s'il correspond à un prélèvement attendu, propose de le marquer passé ;
 * sinon l'enregistre selon son classement et propose, si besoin, de créer l'abonnement.
 */
export function useRecordUnknownDebit() {
  const db = useDb();
  const queryClient = useQueryClient();
  const review = useReviewCharge();
  const [busy, setBusy] = useState(false);

  const done = async (message: string) => {
    await queryClient.invalidateQueries();
    requestReschedule();
    showDialog('Enregistré', message, undefined, { tone: 'ok' });
    router.back();
  };

  const submit = async ({ name, amount, date }: { name: string; amount: string; date: string }) => {
    const debit = { name: name.trim(), amountCents: parseAmountCents(amount), date };
    setBusy(true);
    try {
      const outcome = await classifyDebit(db, debit);
      if (outcome.kind === 'matches_charge') {
        showDialog(`C’est le prélèvement ${outcome.name} du ${formatDayMonth(outcome.dueDate)} ?`, undefined, [
          { text: 'Non', style: 'cancel', onPress: () => setBusy(false) },
          {
            text: 'Oui',
            onPress: () =>
              review.mutate(
                { chargeId: outcome.chargeId, answer: { kind: 'paid', amountCents: debit.amountCents, date } },
                { onSuccess: () => done('Prélèvement marqué comme passé.'), onSettled: () => setBusy(false) },
              ),
          },
        ]);
        return;
      }
      await recordUnknownDebit(db, debit, outcome, newId);
      if (outcome.offerCreateSubscription) {
        await queryClient.invalidateQueries();
        showDialog('Prélèvement inattendu', `${formatEuros(debit.amountCents)} débités par ${debit.name}. Créer l’abonnement ?`, [
          { text: 'Non', style: 'cancel', onPress: () => router.back() },
          {
            text: 'Créer',
            onPress: () => router.replace({ pathname: '/subscriptions/new', params: { name: debit.name, amount, date } }),
          },
        ]);
      } else {
        await done(unknownDebitLabel(outcome.type));
      }
    } catch (error) {
      showError('Enregistrement impossible', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { busy, submit };
}
