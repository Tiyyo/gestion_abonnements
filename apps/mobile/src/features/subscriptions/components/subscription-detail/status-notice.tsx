import { diffDays } from '@abonnements/core';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { noticeKind } from '@/features/subscriptions/detail-hero';
import { toCancelNoticeText, trialNoticeText, trialWhenLabel } from '@/features/subscriptions/detail-labels';
import { dateShort } from '@/lib/dates';
import { DetailNotice } from './detail-notice';

/** Bandeau d'alerte d'un essai en cours ou d'un abonnement à résilier ; rien sinon. */
export function StatusNotice({ row, trialRisk, today }: { row: SubscriptionRow; trialRisk: boolean; today: string }) {
  const kind = noticeKind(row);
  if (kind === 'trial' && row.trial_end_date) {
    return (
      <DetailNotice tone="warn" title={`Fin d’essai ${trialWhenLabel(diffDays(today, row.trial_end_date))}`}>
        {trialNoticeText(trialRisk, row.amount_cents, row.trial_end_date)}
      </DetailNotice>
    );
  }
  if (kind === 'to_cancel' && row.period_end_date) {
    return (
      <DetailNotice tone="danger" title={`Fin de période le ${dateShort(row.period_end_date)}`}>
        {toCancelNoticeText(Boolean(row.cancel_done))}
      </DetailNotice>
    );
  }
  return null;
}
