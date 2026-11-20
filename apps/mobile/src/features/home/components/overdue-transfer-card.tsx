import { formatEuros } from '@abonnements/core';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { transferPurpose } from '@/features/home/home-wording';
import { dateWithWeekday } from '@/lib/dates';
import { ActionButton } from '@/ui/controls/action-button';
import { HomeCard } from './home-card';

export function OverdueTransferCard({ transfer, busy, onDone }: { transfer: PlanTransfer; busy: boolean; onDone: () => void }) {
  return (
    <HomeCard
      tone="danger"
      caption={`Transfert en retard · prévu ${dateWithWeekday(transfer.effectiveDate)}`}
      title={formatEuros(transfer.amountCents)}
      body={transferPurpose(transfer)}
      actions={<ActionButton flex={1} label="Marquer fait" variant="danger" disabled={busy} onPress={onDone} />}
    />
  );
}
