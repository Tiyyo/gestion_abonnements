import { addDays, formatEuros } from '@abonnements/core';
import type { PaydayBreakdownLine, PlanTransfer, PlanTransferCharge, PlanTrial } from '@/db/repositories/plan/types';
import { formatPercentBp, formatWeekdayDayMonth, formatDayMonth } from '@/lib/format';

/** Libellé d'une ligne du virement de paie. */
export function paydayLineLabel(line: PaydayBreakdownLine, globalMarginBp: number): string {
  if (line.kind === 'charges') {
    return `Prélèvements du mois (marge ${formatPercentBp(globalMarginBp)})`;
  }
  return `${line.kind === 'provision' ? 'Provision' : 'Complément'} (${line.name ?? '?'})`;
}

/** Détail d'un prélèvement financé par un transfert : « le 12 » s'il tombe le lendemain du transfert, sinon le jour complet. */
export function chargeLine(transfer: PlanTransfer, charge: PlanTransferCharge): string {
  const when =
    charge.dueDate === addDays(transfer.effectiveDate, 1)
      ? `le ${Number(charge.dueDate.slice(8, 10))}`
      : formatWeekdayDayMonth(charge.dueDate).toLowerCase();
  return `Prélèvement ${when} · ${formatEuros(charge.expectedAmountCents)} + ${formatPercentBp(charge.marginBp)}`;
}

/** Montant des transferts coffre → compte qui restent à faire. */
export function remainingTransfersCents(transfers: PlanTransfer[]): number {
  return transfers.filter((t) => !t.done).reduce((sum, t) => sum + t.amountCents, 0);
}

export function hasTrialRisk(trials: PlanTrial[]): boolean {
  return trials.some((t) => t.risk);
}

/** Message d'un essai : à risque, il pourrait passer ; sinon il dépasse le solde prévu et échouera. */
export function trialMessage(trial: PlanTrial): string {
  return trial.risk
    ? `${trial.name} (${formatEuros(trial.amountCents)}) pourrait passer le ${formatDayMonth(trial.dueDate)} : le compte aura environ ${formatEuros(trial.projectedCents)}. Décide avant, ou reporte le transfert de ce jour-là.`
    : `${trial.name} (${formatEuros(trial.amountCents)}) dépasse le solde prévu de ${formatEuros(Math.max(0, trial.projectedCents))}, il échouera.`;
}
