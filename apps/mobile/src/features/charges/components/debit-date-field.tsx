import { YStack } from 'tamagui';
import { pickDebitDate } from '@/features/charges/pick-debit-date';
import { formatDateFr } from '@/lib/format';
import { DateField } from '@/ui/controls/date-field';
import { Label } from '@/ui/text/typography';

export function DebitDateField({
  date,
  today,
  onChange,
  accessibilityLabel,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
  accessibilityLabel?: string;
}) {
  return (
    <YStack gap="2">
      <Label>Date du débit</Label>
      <DateField label={formatDateFr(date)} accessibilityLabel={accessibilityLabel} onPress={() => pickDebitDate(date, today, onChange)} />
    </YStack>
  );
}
