import { formatEuros } from '@abonnements/core';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { transferPurpose, whenLabel } from '@/features/home/home-wording';
import { ActionButton } from '@/ui/controls/action-button';
import { HomeCard } from './home-card';

interface Props {
  transfer: PlanTransfer;
  today: string;
  busy: boolean;
  onDone: () => void;
  onReschedule: () => void;
  onRevolut: () => void;
}

export function NextTransferCard({ transfer, today, busy, onDone, onReschedule, onRevolut }: Props) {
  const amount = formatEuros(transfer.amountCents);
  return (
    <HomeCard
      tone="accent"
      caption={`Prochain transfert · ${whenLabel(transfer.effectiveDate, today)}`}
      title={amount}
      body={transferPurpose(transfer)}
      actions={
        <>
          <ActionButton
            flex={1}
            label="Marquer fait"
            accessibilityLabel={`Marquer fait le transfert de ${amount}`}
            variant="primary"
            disabled={busy}
            onPress={onDone}
            testID="home.next-done"
          />
          <ActionButton
            flex={1}
            label="Reporter"
            accessibilityLabel={`Reporter le transfert de ${amount}`}
            variant="soft"
            disabled={busy}
            onPress={onReschedule}
            testID="home.next-reschedule"
          />
        </>
      }
      footer={
        <ActionButton
          size="sm"
          label="Copier et ouvrir Revolut"
          accessibilityLabel="Copier le montant et ouvrir Revolut"
          variant="outline"
          onPress={onRevolut}
        />
      }
    />
  );
}
