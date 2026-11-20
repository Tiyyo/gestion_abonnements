import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { paymentMethodLabel } from '@/features/subscriptions/detail-labels';
import { Card } from '@/ui/surfaces/card';
import { CancelLink } from './cancel-link';
import { DetailRow } from './detail-row';
import { StatusRows } from './status-rows';

type Props = Pick<SubscriptionDetail, 'row' | 'settings' | 'nextCharge' | 'provisionedCents'>;

export function DetailInfoCard({ row, settings, nextCharge, provisionedCents }: Props) {
  return (
    <Card py="0" gap="0">
      <StatusRows row={row} settings={settings} nextCharge={nextCharge} provisionedCents={provisionedCents} />
      <DetailRow label="Moyen de paiement">{paymentMethodLabel(row.payment_method)}</DetailRow>
      {row.notes ? <DetailRow label="Notes">{row.notes}</DetailRow> : null}
      <DetailRow label="Lien de résiliation" last>
        {row.cancel_url ? <CancelLink url={row.cancel_url} /> : 'Non renseigné'}
      </DetailRow>
    </Card>
  );
}
