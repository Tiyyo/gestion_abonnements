import { todayIn } from '@abonnements/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import { ModalFooter } from '@/features/charges/components/modal-footer';
import { UnknownDebitFields } from '@/features/charges/components/unknown-debit-fields';
import { useRecordUnknownDebit } from '@/features/charges/hooks/use-record-unknown-debit';
import { useUnknownDebitForm } from '@/features/charges/hooks/use-unknown-debit-form';
import { TOP_GAP } from '@/theme/layout';
import { ActionButton } from '@/ui/controls/action-button';
import { ModalHeader } from '@/ui/navigation/modal-header';

export default function UnknownDebitScreen() {
  const insets = useSafeAreaInsets();
  const today = todayIn();
  const form = useUnknownDebitForm(today);
  const record = useRecordUnknownDebit();

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <ModalHeader title="Prélèvement inconnu" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 18 }}>
        <UnknownDebitFields form={form} today={today} />
      </ScrollView>
      <ModalFooter>
        <ActionButton
          flex={1}
          size="lg"
          label="Enregistrer"
          disabled={!form.valid}
          loading={record.busy}
          onPress={() => record.submit(form)}
        />
      </ModalFooter>
    </YStack>
  );
}
