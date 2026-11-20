import { ScrollView, YStack } from 'tamagui';
import { Caption } from '@/ui/text/typography';
import { SheetScreen } from '@/ui/surfaces/sheet-screen';
import { DetailsGroup } from './details-group';
import { FieldError } from './field-error';
import { SheetFooter } from '@/ui/surfaces/sheet-footer';
import { SheetHeader } from '@/ui/navigation/sheet-header';
import { FormHero } from './form-hero';
import { fundingPreview, PER } from './form-labels';
import { FormSheet } from './form-sheet';
import { FundingPreview } from './funding-preview';
import { OptionsGroup } from './options-group';
import { StatusField } from './status-field';
import { SuggestionCard } from './suggestion-card';
import { type SubscriptionFormOptions, useSubscriptionForm } from './use-subscription-form';

interface Props extends SubscriptionFormOptions {
  title: string;
  submitLabel: string;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
}

export function SubscriptionForm({ title, submitLabel, busy, error, onCancel, ...options }: Props) {
  const form = useSubscriptionForm(options);
  const { mode, lockedStatus } = options;
  const { values, choices, lookup } = form;
  const marginBp = values.marginOverrideBp ?? form.globalMarginBp;
  const { funded, monthly } = fundingPreview(values.amount, marginBp, values.periodicity);

  return (
    <SheetScreen>
      <SheetHeader title={title} onCancel={onCancel} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <FormHero
          control={form.control}
          errors={form.errors}
          name={values.name}
          iconKey={values.iconKey}
          caption={`${form.categoryName} · ${PER[values.periodicity]}`}
          trial={form.status === 'trial'}
          onLogo={() => choices.sheet.show('logo')}
          onLookup={lookup.lookupNow}
        />

        <YStack px="4" pt="5" gap="5">
          {form.offeredSuggestion ? (
            <SuggestionCard
              suggestion={form.offeredSuggestion}
              name={lookup.lookupName}
              categoryName={form.suggestedCategory}
              onIgnore={lookup.markHandled}
              onApply={form.acceptSuggestion}
            />
          ) : null}
          {!lockedStatus ? <StatusField control={form.control} onChange={form.changeStatus} /> : null}
          <DetailsGroup
            categoryName={form.categoryName}
            periodicity={values.periodicity}
            status={form.status}
            firstChargeDate={values.firstChargeDate}
            onOpen={choices.sheet.show}
            onPickDate={form.pickDate}
          />
          <FieldError message={form.errors.firstChargeDate?.message} />
          {funded > 0 && values.paymentMethod === 'revolut' ? (
            <FundingPreview funded={funded} monthly={monthly} marginBp={marginBp} />
          ) : null}
          {mode === 'edit' ? (
            <OptionsGroup
              control={form.control}
              errors={form.errors}
              paymentMethod={values.paymentMethod}
              marginOverrideBp={values.marginOverrideBp}
              globalMarginBp={form.globalMarginBp}
              onOpenPayment={() => choices.sheet.show('payment')}
              onMarginChange={choices.margin}
            />
          ) : null}
          {mode === 'create' && lookup.aiEnabled ? (
            <Caption text="center" px="4">
              Seul le nom est envoyé à l’IA, jamais le montant.
            </Caption>
          ) : null}
          <FieldError message={error ?? undefined} />
        </YStack>
      </ScrollView>

      <SheetFooter busy={busy} label={submitLabel} onPress={() => form.submit()} />
      <FormSheet
        open={choices.sheet.open}
        shown={choices.sheet.shown}
        onClose={choices.sheet.close}
        choices={{
          ...values,
          categories: form.categories,
          onCategory: choices.category,
          onPeriodicity: choices.periodicity,
          onPayment: choices.payment,
          onIcon: choices.icon,
        }}
      />
    </SheetScreen>
  );
}
