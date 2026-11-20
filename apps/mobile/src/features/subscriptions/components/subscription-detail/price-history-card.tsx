import { YStack } from 'tamagui';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { priceSummary } from '@/features/subscriptions/price-history';
import { Card } from '@/ui/surfaces/card';
import { Label, Overline } from '@/ui/text/typography';
import { PriceChangeRow } from './price-change-row';
import { PriceStepChart } from './price-step-chart';

type Props = Pick<SubscriptionDetail, 'row' | 'priceHistory'>;

/** « Évolution du prix » : résumé, graphique en escalier et liste des changements (le plus récent d'abord). Masquée sans changement. */
export function PriceHistoryCard({ row, priceHistory }: Props) {
  if (priceHistory.length === 0) {
    return null;
  }
  return (
    <YStack gap="2">
      <Overline px="1">Évolution du prix</Overline>
      <Card gap="3">
        <Label>{priceSummary(priceHistory, row)}</Label>
        <PriceStepChart changes={priceHistory} />
        <YStack>
          {[...priceHistory].reverse().map((item, index) => (
            <PriceChangeRow key={item.id} item={item} first={index === 0} />
          ))}
        </YStack>
      </Card>
    </YStack>
  );
}
