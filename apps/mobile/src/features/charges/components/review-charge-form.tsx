import { CalendarDays } from 'lucide-react-native';
import { ScrollView, YStack } from 'tamagui';
import { useReviewActions } from '@/features/charges/hooks/use-review-actions';
import { useReviewForm } from '@/features/charges/hooks/use-review-form';
import { pickDebitDate } from '@/features/charges/pick-debit-date';
import type { ChargeToReview } from '@/features/charges/types';
import { dateShort } from '@/lib/dates';
import { useDiscardGuard } from '@/ui/navigation/use-discard-guard';
import { PickerRow } from '@/ui/controls/picker-row';
import { FormGroup } from '@/ui/surfaces/form-group';
import { SheetFooter } from '@/ui/surfaces/sheet-footer';
import { BankHintNotice } from './bank-hint-notice';
import { ReviewChargeHero } from './review-charge-hero';
import { ReviewOutcomes } from './review-outcomes';

/**
 * Rapprochement d'un prélèvement (contenu de la feuille) : montant et date réellement débités, puis « passé » ou « échoué ».
 * Si la lecture du compte n'a vu aucun débit, « échoué » devient la réponse mise en avant (bouton plein).
 */
export function ReviewChargeForm({ row, today }: { row: ChargeToReview; today: string }) {
  const form = useReviewForm(row, today);
  const guard = useDiscardGuard(form.dirty, 'Le montant et la date que tu as modifiés ne seront pas enregistrés.');
  const actions = useReviewActions(row, guard.leave);
  const failedSuggested = row.bankHint?.kind === 'no_debit';
  const paid = { label: 'Il est passé', onPress: () => actions.paid(form.amountCents, form.date), disabled: !form.validAmount };
  const failed = { label: 'Il a échoué', onPress: () => actions.failed(form.amountCents), disabled: false };
  const [primary, secondary] = failedSuggested ? [failed, paid] : [paid, failed];

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <ReviewChargeHero row={row} form={form} />
        <YStack px="4" pt="5" gap="5">
          {row.bankHint ? <BankHintNotice hint={row.bankHint} /> : null}
          <FormGroup title="Débit">
            <PickerRow
              icon={CalendarDays}
              label="Date du débit"
              value={dateShort(form.date, today)}
              onPress={() => pickDebitDate(form.date, today, form.setDate)}
              last
            />
          </FormGroup>
          <ReviewOutcomes row={row} />
        </YStack>
      </ScrollView>
      <SheetFooter label={primary.label} busy={actions.busy} disabled={primary.disabled} onPress={primary.onPress} secondary={secondary} />
    </>
  );
}
