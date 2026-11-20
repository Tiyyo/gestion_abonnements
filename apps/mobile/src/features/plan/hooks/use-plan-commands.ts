import { formatEuros } from '@abonnements/core';
import type { MonthPlan, PlanTransfer } from '@/db/repositories/plan/types';
import { usePlanRun } from '@/features/plan/hooks/use-plan-run';
import { pickRescheduleDate } from '@/features/plan/pick-reschedule-date';
import { paydayDoneFeedback, rescheduleFeedback, transferDoneFeedback } from '@/features/plan/plan-feedback';
import { dateShort } from '@/lib/dates';
import { showDialog } from '@/ui/feedback/show-dialog';

/**
 * Actions du Plan (transferts, virement de paie, résidu). Celles qu'une commande inverse défait exactement sont faites
 * tout de suite et annoncées par un message « Annuler » ; les autres gardent leur confirmation.
 */
export function usePlanCommands(today: string) {
  const { run, busy } = usePlanRun();

  const setDate = (transfer: PlanTransfer, date: string | null) =>
    run({ type: 'reschedule', transferId: transfer.id, date }, rescheduleFeedback(transfer, date));

  const reschedule = (transfer: PlanTransfer) => pickRescheduleDate(transfer, today, (date) => setDate(transfer, date));

  const moreTransfer = (transfer: PlanTransfer) => {
    if (transfer.done) {
      // Confirmation gardée : remettre à faire regroupe à nouveau les transferts, ce que « marquer fait » ne défait pas toujours.
      showDialog('Transfert fait', 'Le remettre en « à faire » ?', [
        { text: 'Non', style: 'cancel' },
        { text: 'Remettre à faire', onPress: () => run({ type: 'transfer_undo', transferId: transfer.id }) },
      ]);
      return;
    }
    showDialog(`Transfert du ${dateShort(transfer.effectiveDate)}`, undefined, [
      { text: 'Fermer', style: 'cancel' },
      ...(transfer.rescheduled ? [{ text: 'Annuler le report', onPress: () => setDate(transfer, null) }] : []),
      { text: 'Reporter', onPress: () => reschedule(transfer) },
    ]);
  };

  const toggleTransfer = (transfer: PlanTransfer) => {
    if (transfer.done) {
      moreTransfer(transfer);
      return;
    }
    run({ type: 'transfer_done', transferId: transfer.id }, transferDoneFeedback(transfer.id));
  };

  const paydayDone = (plan: MonthPlan) => run({ type: 'payday_done', period: plan.period }, paydayDoneFeedback());

  // Confirmation gardée : refaire le virement plus tard recalcule les provisions, il ne rétablit pas forcément les mêmes montants.
  const paydayUndo = (plan: MonthPlan) =>
    showDialog('Virement de paie', 'Annuler le virement marqué fait ? Les provisions de ce mois seront retirées.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Annuler le virement',
        style: 'destructive',
        onPress: () => run({ type: 'payday_undo', transferId: plan.payday.transferId ?? '' }),
      },
    ]);

  // Confirmation gardée : aucune commande ne retire un retour au coffre enregistré.
  const returnResidual = (amountCents: number) =>
    showDialog('Renvoyer au coffre', `As-tu renvoyé ${formatEuros(amountCents)} au coffre ?`, [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, c’est fait', onPress: () => run({ type: 'residual', amountCents }) },
    ]);

  return { busy, toggleTransfer, moreTransfer, paydayDone, paydayUndo, returnResidual };
}
