import { formatEuros, todayIn } from '@abonnements/core';
import { router, useLocalSearchParams } from 'expo-router';
import { Spinner } from 'tamagui';
import { SubscriptionForm } from '../../../components/SubscriptionForm';
import { fundedFutureCharges } from '../../../db/commands';
import { useDb } from '../../../db/provider';
import { useSubscriptionDetail } from '../../../features/subscription-detail';
import { centsToInput, parseAmountCents, periodicityKeyOf, periodicityOf } from '../../../features/subscription-form';
import { useUpdateSubscription } from '../../../features/subscriptions';
import { formatDayMonth } from '../../../ui/format';
import { showDialog } from '../../../ui/dialog';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const detail = useSubscriptionDetail(id);
  const update = useUpdateSubscription(id);

  if (!detail.data) {
    return <Spinner flex={1} color="primary" />;
  }
  const { row } = detail.data;

  return (
    <SubscriptionForm
      mode="edit"
      title="Modifier"
      submitLabel="Enregistrer"
      lockedStatus={row.status}
      defaultValues={{
        name: row.name,
        amount: centsToInput(row.status === 'trial' ? (row.post_trial_amount_cents ?? row.amount_cents) : row.amount_cents),
        periodicity: periodicityKeyOf(row.period_unit, row.period_count),
        status: row.status === 'trial' ? 'trial' : 'active',
        firstChargeDate: row.status === 'trial' ? (row.trial_end_date ?? row.next_charge_date) : row.next_charge_date,
        categoryId: row.category_id,
        iconKey: row.icon_key === 'tag' ? null : row.icon_key,
        cancelUrl: row.cancel_url ?? '',
        marginOverrideBp: row.margin_override_bp,
        paymentMethod: row.payment_method,
        notes: row.notes ?? '',
      }}
      busy={update.isPending}
      error={update.isError ? `Enregistrement impossible : ${update.error.message}` : null}
      onCancel={() => router.back()}
      onSubmit={async (values, correction) => {
        const periodicity = periodicityOf(values.periodicity);
        const edit = {
          name: values.name,
          amountCents: parseAmountCents(values.amount),
          periodUnit: periodicity.unit,
          periodCount: periodicity.count,
          date: values.firstChargeDate,
          categoryId: values.categoryId,
          iconKey: values.iconKey,
          cancelUrl: values.cancelUrl || null,
          marginOverrideBp: values.marginOverrideBp,
          paymentMethod: values.paymentMethod,
          notes: values.notes.trim() || null,
        };
        const save = () => update.mutate({ edit, options: { correction } }, { onSuccess: () => router.back() });
        const touchesPlan =
          edit.amountCents !== row.amount_cents ||
          edit.marginOverrideBp !== row.margin_override_bp ||
          edit.periodUnit !== row.period_unit ||
          edit.periodCount !== row.period_count ||
          edit.paymentMethod !== row.payment_method ||
          edit.date !== row.next_charge_date;
        const funded = touchesPlan ? await fundedFutureCharges(db, id, todayIn()) : [];
        if (funded.length === 0) {
          save();
          return;
        }
        showDialog(
          'Transfert déjà fait',
          `${funded.map((c) => `Le prélèvement du ${formatDayMonth(c.due_date)} est déjà alimenté (${formatEuros(c.funded_amount_cents)}) : il ne change pas.`).join('\n')}\nLes prélèvements suivants seront recalculés.`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Enregistrer', onPress: save },
          ],
        );
      }}
    />
  );
}
