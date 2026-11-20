import { effectiveMarginBp, formatEuros, fundedAmountCents, todayIn } from '@abonnements/core';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { appliedMarginLabel, rhythmLabel, transferLabel } from '@/features/subscriptions/detail-labels';
import { monthlyProvisionCents } from '@/features/subscriptions/funding';
import { dateWithWeekday } from '@/lib/dates';
import { formatPercentBp } from '@/lib/format';
import { DetailRow } from './detail-row';

type Props = Pick<SubscriptionDetail, 'row' | 'settings' | 'nextCharge' | 'provisionedCents'>;

/** Lignes propres au statut : fin d'essai, fin de période, ou échéancier et provisions d'un abonnement actif. */
export function StatusRows({ row, settings, nextCharge, provisionedCents }: Props) {
  const margin = effectiveMarginBp(row.margin_override_bp, settings.global_margin_bp);
  const funded = fundedAmountCents(row.amount_cents, margin);
  const today = todayIn();
  const rhythm = rhythmLabel(row.amount_cents, row.period_unit, row.period_count);

  if (row.status === 'trial' && row.trial_end_date) {
    return (
      <>
        <DetailRow label="Fin d’essai">{dateWithWeekday(row.trial_end_date, today)}</DetailRow>
        <DetailRow label="Montant après essai">{rhythm}</DetailRow>
        <DetailRow label="À sortir du coffre si gardé">{`${formatEuros(funded)} (marge ${formatPercentBp(margin)})`}</DetailRow>
      </>
    );
  }
  if (row.status === 'to_cancel' && row.period_end_date) {
    return (
      <>
        <DetailRow label="Montant">{rhythm}</DetailRow>
        <DetailRow label="Fin de période">{dateWithWeekday(row.period_end_date, today)}</DetailRow>
        <DetailRow label="Résiliation chez le marchand">{row.cancel_done ? 'Faite' : 'À faire'}</DetailRow>
      </>
    );
  }
  if (row.status === 'cancelled') {
    return <DetailRow label="Montant">{rhythm}</DetailRow>;
  }
  const provision = monthlyProvisionCents(funded, row.period_unit, row.period_count);
  return (
    <>
      <DetailRow label="Montant">{rhythm}</DetailRow>
      <DetailRow label="Prochain prélèvement">{dateWithWeekday(row.next_charge_date, today)}</DetailRow>
      <DetailRow label="Transfert prévu">{transferLabel(nextCharge)}</DetailRow>
      <DetailRow label="Marge appliquée">{appliedMarginLabel(margin, row.margin_override_bp)}</DetailRow>
      {provision !== null && <DetailRow label="Provision mensuelle">{formatEuros(provision)}</DetailRow>}
      {provision !== null && <DetailRow label="Provision cumulée">{`${formatEuros(provisionedCents)} / ${formatEuros(funded)}`}</DetailRow>}
    </>
  );
}
