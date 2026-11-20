import { todayIn } from '@abonnements/core';
import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { ScrollView, YStack } from 'tamagui';
import { pickDebitDate } from '@/features/charges/pick-debit-date';
import { UnknownDebitHero } from '@/features/charges/components/unknown-debit-hero';
import { UnknownDebitOutcomes } from '@/features/charges/components/unknown-debit-outcomes';
import { useRecordUnknownDebit } from '@/features/charges/hooks/use-record-unknown-debit';
import { useUnknownDebitForm } from '@/features/charges/hooks/use-unknown-debit-form';
import { formatDateFr } from '@/lib/format';
import { PickerRow } from '@/ui/controls/picker-row';
import { SheetHeader } from '@/ui/navigation/sheet-header';
import { FormGroup } from '@/ui/surfaces/form-group';
import { SheetFooter } from '@/ui/surfaces/sheet-footer';
import { SheetScreen } from '@/ui/surfaces/sheet-screen';

export default function UnknownDebitScreen() {
  const today = todayIn();
  const form = useUnknownDebitForm(today);
  const record = useRecordUnknownDebit();

  return (
    <SheetScreen>
      <SheetHeader title="Prélèvement non prévu" onCancel={() => router.back()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <UnknownDebitHero form={form} />
        <YStack px="4" pt="5" gap="5">
          <FormGroup title="Débit">
            <PickerRow
              icon={CalendarDays}
              label="Date du débit"
              value={formatDateFr(form.date)}
              onPress={() => pickDebitDate(form.date, today, form.setDate)}
              last
            />
          </FormGroup>
          <UnknownDebitOutcomes />
        </YStack>
      </ScrollView>
      <SheetFooter label="Enregistrer le prélèvement" busy={record.busy} disabled={!form.valid} onPress={() => record.submit(form)} />
    </SheetScreen>
  );
}
