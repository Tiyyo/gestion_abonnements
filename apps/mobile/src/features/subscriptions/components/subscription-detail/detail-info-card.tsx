import { YStack } from 'tamagui';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { paymentMethodLabel } from '@/features/subscriptions/detail-labels';
import { Card } from '@/ui/surfaces/card';
import { Overline } from '@/ui/text/typography';
import { CancelLink } from './cancel-link';
import { DetailRow } from './detail-row';
import { StatusRows } from './status-rows';

type Props = Pick<SubscriptionDetail, 'row' | 'settings' | 'provisionedCents'> & {
  /** Première carte sous l'en-tête : elle chevauche le dégradé, titre en blanc et ombre portée plus forte. */
  lift?: boolean;
};

/** Ce que la carte en verre de l'en-tête ne dit pas : financement, moyen de paiement, notes, lien de résiliation. */
export function DetailInfoCard({ row, settings, provisionedCents, lift }: Props) {
  return (
    <YStack gap="2">
      <Overline px="1" color={lift ? 'onGlassMuted' : undefined}>
        Détails
      </Overline>
      <Card py="0" gap="0" lift={lift}>
        <StatusRows row={row} settings={settings} provisionedCents={provisionedCents} />
        <DetailRow label="Moyen de paiement">{paymentMethodLabel(row.payment_method)}</DetailRow>
        {row.notes ? <DetailRow label="Notes">{row.notes}</DetailRow> : null}
        <DetailRow label="Lien de résiliation" last>
          {row.cancel_url ? <CancelLink url={row.cancel_url} /> : 'Non renseigné'}
        </DetailRow>
      </Card>
    </YStack>
  );
}
