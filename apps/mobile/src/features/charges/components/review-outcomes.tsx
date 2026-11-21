import { Check, X } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { reviewOutcomes } from '@/features/charges/review-labels';
import type { ChargeToReview } from '@/features/charges/types';
import { Card } from '@/ui/surfaces/card';
import { Overline } from '@/ui/text/typography';
import { OutcomeRow } from './outcome-row';

const ICONS = { paid: Check, failed: X } as const;

/** Ce que déclenche chacune des deux réponses du pied de feuille. */
export function ReviewOutcomes({ row }: { row: ChargeToReview }) {
  return (
    <YStack gap="2">
      <Overline px="1">Selon ta réponse</Overline>
      <Card gap="3">
        {reviewOutcomes(row).map((outcome) => (
          <OutcomeRow key={outcome.answer} icon={ICONS[outcome.answer]} title={outcome.title} detail={outcome.detail} />
        ))}
      </Card>
    </YStack>
  );
}
