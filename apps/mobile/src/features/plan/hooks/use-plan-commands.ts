import { formatEuros } from '@abonnements/core';
import type { MonthPlan, PlanTransfer } from '@/db/repositories/plan/types';
import { type PlanAction, usePlanAction } from '@/features/plan/hooks/use-plan-action';
import { pickRescheduleDate } from '@/features/plan/pick-reschedule-date';
import { dateShort } from '@/lib/dates';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { haptic } from '@/ui/motion/haptics';

/** Actions du Plan (transferts, virement de paie, résidu) avec leurs confirmations. */
export function usePlanCommands(today: string) {
  const action = usePlanAction();
  const busy = action.isPending;
  const run = (input: PlanAction) => action.mutate(input, { onError: (error) => showError('Action impossible', error.message) });

  const reschedule = (transfer: PlanTransfer) =>
    pickRescheduleDate(transfer, today, (date) => run({ type: 'reschedule', transferId: transfer.id, date }));

  const moreTransfer = (transfer: PlanTransfer) => {
    if (transfer.done) {
      showDialog('Transfert fait', 'Le remettre en « à faire » ?', [
        { text: 'Non', style: 'cancel' },
        { text: 'Remettre à faire', onPress: () => run({ type: 'transfer_undo', transferId: transfer.id }) },
      ]);
      return;
    }
    showDialog(`Transfert du ${dateShort(transfer.effectiveDate)}`, undefined, [
      { text: 'Fermer', style: 'cancel' },
      ...(transfer.rescheduled
        ? [{ text: 'Annuler le report', onPress: () => run({ type: 'reschedule', transferId: transfer.id, date: null }) }]
        : []),
      { text: 'Reporter', onPress: () => reschedule(transfer) },
    ]);
  };

  const toggleTransfer = (transfer: PlanTransfer) => {
    if (transfer.done) {
      moreTransfer(transfer);
      return;
    }
    haptic.success();
    run({ type: 'transfer_done', transferId: transfer.id });
  };

  const paydayDone = (plan: MonthPlan) => {
    haptic.success();
    run({ type: 'payday_done', period: plan.period });
  };

  const paydayUndo = (plan: MonthPlan) =>
    showDialog('Virement de paie', 'Annuler le virement marqué fait ? Les provisions de ce mois seront retirées.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Annuler le virement',
        style: 'destructive',
        onPress: () => run({ type: 'payday_undo', transferId: plan.payday.transferId ?? '' }),
      },
    ]);

  const returnResidual = (amountCents: number) =>
    showDialog('Renvoyer au coffre', `As-tu renvoyé ${formatEuros(amountCents)} au coffre ?`, [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, c’est fait', onPress: () => run({ type: 'residual', amountCents }) },
    ]);

  return { busy, toggleTransfer, moreTransfer, paydayDone, paydayUndo, returnResidual };
}
