import { formatEuros } from '@abonnements/core';
import type { PaydayBreakdownLine, PlanTransfer, PlanTransferCharge, PlanTrial } from '@/db/repositories/plan/types';
import { dateShort, dateWithWeekday } from '@/lib/dates';
import { formatPercentBp } from '@/lib/format';

/** Libellé d'une ligne du virement de paie. */
export function paydayLineLabel(line: PaydayBreakdownLine, globalMarginBp: number): string {
  if (line.kind === 'charges') {
    return `Prélèvements du mois (marge ${formatPercentBp(globalMarginBp)})`;
  }
  return `${line.kind === 'provision' ? 'Provision' : 'Complément'} (${line.name ?? '?'})`;
}

/** Détail d'un prélèvement financé par un transfert, daté comme le transfert lui-même : « Prélèvement sam. 28 nov. · … ». */
export function chargeLine(charge: PlanTransferCharge): string {
  return `Prélèvement ${dateWithWeekday(charge.dueDate)} · ${formatEuros(charge.expectedAmountCents)} + ${formatPercentBp(charge.marginBp)}`;
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
    ? `${trial.name} (${formatEuros(trial.amountCents)}) pourrait passer le ${dateShort(trial.dueDate)} : le compte aura environ ${formatEuros(trial.projectedCents)}. Décide avant, ou reporte le transfert de ce jour-là.`
    : `${trial.name} (${formatEuros(trial.amountCents)}) dépasse le solde prévu de ${formatEuros(Math.max(0, trial.projectedCents))}, il échouera.`;
}
