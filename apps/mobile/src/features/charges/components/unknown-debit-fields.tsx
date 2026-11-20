import { YStack } from 'tamagui';
import { DebitDateField } from './debit-date-field';
import { FormInput } from './form-input';
import type { useUnknownDebitForm } from '@/features/charges/hooks/use-unknown-debit-form';
import { Body, Label } from '@/ui/text/typography';

export function UnknownDebitFields({ form, today }: { form: ReturnType<typeof useUnknownDebitForm>; today: string }) {
  return (
    <>
      <Body color="colorMuted">Un débit vu sur ton relevé Revolut, que l’app ne connaît pas encore.</Body>
      <YStack gap="2">
        <Label>Nom du marchand</Label>
        <FormInput value={form.name} onChangeText={form.setName} autoCapitalize="words" accessibilityLabel="Nom du marchand" />
      </YStack>
      <YStack gap="2">
        <Label>Montant (€)</Label>
        <FormInput
          value={form.amount}
          onChangeText={form.setAmount}
          placeholder="9,99"
          keyboardType="decimal-pad"
          accessibilityLabel="Montant"
        />
      </YStack>
      <DebitDateField date={form.date} today={today} onChange={form.setDate} />
    </>
  );
}
