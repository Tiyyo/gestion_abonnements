import { YStack } from 'tamagui';
import { FormInput } from './form-input';
import { Caption, Label } from '@/ui/text/typography';

export function ReviewAmountField({
  unfunded,
  value,
  valid,
  onChange,
}: {
  unfunded: boolean;
  value: string;
  valid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <YStack gap="2">
      <Label>{unfunded ? 'Montant débité (€)' : 'Montant débité ou nouveau prix (€)'}</Label>
      <FormInput value={value} onChangeText={onChange} keyboardType="decimal-pad" accessibilityLabel="Montant débité en euros" />
      {!valid && <Caption color="dangerText">Montant invalide, par exemple 9,99</Caption>}
    </YStack>
  );
}
