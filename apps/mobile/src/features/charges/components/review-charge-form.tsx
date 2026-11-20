import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import { DebitDateField } from './debit-date-field';
import { ModalFooter } from './modal-footer';
import { ReviewAmountField } from './review-amount-field';
import { ReviewChargeSummary } from './review-charge-summary';
import { useReviewActions } from '@/features/charges/hooks/use-review-actions';
import { useReviewForm } from '@/features/charges/hooks/use-review-form';
import type { ChargeToReview } from '@/features/charges/types';
import { formatDateFr } from '@/lib/format';
import { TOP_GAP } from '@/theme/layout';
import { ActionButton } from '@/ui/controls/action-button';
import { ModalHeader } from '@/ui/navigation/modal-header';

/** Rapprochement d'un prélèvement : montant et date réellement débités, puis « passé » ou « échoué ». */
export function ReviewChargeForm({ row, today }: { row: ChargeToReview; today: string }) {
  const insets = useSafeAreaInsets();
  const form = useReviewForm(row, today);
  const actions = useReviewActions(row);

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <ModalHeader />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 18 }}>
        <ReviewChargeSummary row={row} />
        <ReviewAmountField unfunded={row.status === 'unfunded'} value={form.amount} valid={form.validAmount} onChange={form.setAmount} />
        <DebitDateField
          date={form.date}
          today={today}
          onChange={form.setDate}
          accessibilityLabel={`Date du débit : ${formatDateFr(form.date)}. Modifier`}
        />
      </ScrollView>
      <ModalFooter>
        <ActionButton
          flex={1}
          size="lg"
          label="Il a échoué"
          variant="outline"
          disabled={actions.busy}
          onPress={() => actions.failed(form.amountCents)}
        />
        <ActionButton
          flex={1}
          size="lg"
          label="Il est passé"
          disabled={actions.busy || !form.validAmount}
          onPress={() => actions.paid(form.amountCents, form.date)}
        />
      </ModalFooter>
    </YStack>
  );
}
