import { router, useLocalSearchParams } from 'expo-router';
import { Spinner } from 'tamagui';
import { SubscriptionForm } from '@/features/subscriptions/components/subscription-form/subscription-form';
import { useSaveSubscriptionEdit } from '@/features/subscriptions/hooks/use-save-subscription-edit';
import { useSubscriptionDetail } from '@/features/subscriptions/hooks/use-subscription-detail';
import { editSubscriptionDefaults } from '@/features/subscriptions/subscription-form-values';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useSubscriptionDetail(id);
  const { save, update } = useSaveSubscriptionEdit(detail.data?.row, id);

  if (!detail.data) {
    return <Spinner flex={1} color="primaryText" />;
  }
  const { row } = detail.data;

  return (
    <SubscriptionForm
      mode="edit"
      title="Modifier"
      submitLabel="Enregistrer"
      lockedStatus={row.status}
      defaultValues={editSubscriptionDefaults(row)}
      busy={update.isPending}
      error={update.isError ? `Enregistrement impossible : ${update.error.message}` : null}
      onCancel={() => router.back()}
      onSubmit={(values, correction, _aiSuggestion, close) => save(values, correction, close)}
    />
  );
}
