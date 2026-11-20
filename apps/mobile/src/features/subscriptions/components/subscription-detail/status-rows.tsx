import { effectiveMarginBp, formatEuros, fundedAmountCents } from '@abonnements/core';
import { noticeKind } from '@/features/subscriptions/detail-hero';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { appliedMarginLabel } from '@/features/subscriptions/detail-labels';
import { monthlyProvisionCents } from '@/features/subscriptions/funding';
import { formatPercentBp } from '@/lib/format';
import { DetailRow } from './detail-row';

type Props = Pick<SubscriptionDetail, 'row' | 'settings' | 'provisionedCents'>;

/**
 * Lignes de financement propres au statut : ce qu'un essai coûtera au coffre s'il est gardé, ou la marge et les provisions
 * d'un abonnement actif. Montant, rythme et échéances sont dans la carte en verre de l'en-tête (`heroFacts`).
 */
export function StatusRows({ row, settings, provisionedCents }: Props) {
  const margin = effectiveMarginBp(row.margin_override_bp, settings.global_margin_bp);
  const funded = fundedAmountCents(row.amount_cents, margin);
  const kind = noticeKind(row);

  if (kind === 'trial') {
    return <DetailRow label="À sortir du coffre si gardé">{`${formatEuros(funded)} (marge ${formatPercentBp(margin)})`}</DetailRow>;
  }
  if (kind === 'to_cancel' || row.status === 'cancelled') {
    return null;
  }
  const provision = monthlyProvisionCents(funded, row.period_unit, row.period_count);
  return (
    <>
      <DetailRow label="Marge appliquée">{appliedMarginLabel(margin, row.margin_override_bp)}</DetailRow>
      {provision !== null && <DetailRow label="Provision mensuelle">{formatEuros(provision)}</DetailRow>}
      {provision !== null && <DetailRow label="Provision cumulée">{`${formatEuros(provisionedCents)} / ${formatEuros(funded)}`}</DetailRow>}
    </>
  );
}
