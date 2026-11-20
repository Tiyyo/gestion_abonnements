import { todayIn } from '@abonnements/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markPaydayDone } from '@/db/commands/mark-payday-done';
import { markTransferDone } from '@/db/commands/mark-transfer-done';
import { rescheduleTransfer } from '@/db/commands/reschedule-transfer';
import { returnResidual } from '@/db/commands/return-residual';
import { undoPayday } from '@/db/commands/undo-payday';
import { undoTransferDone } from '@/db/commands/undo-transfer-done';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import type { DB } from '@/db/types';
import type { PlanAction } from '@/features/plan/plan-action';
import { subscriptionsKey } from '@/features/subscriptions/query-keys';
import type { Kysely } from 'kysely';

/** Exécute l'action ; renvoie l'identifiant du virement de paie créé (`payday_done`), sinon `null`. */
async function execute(db: Kysely<DB>, action: PlanAction): Promise<string | null> {
  switch (action.type) {
    case 'transfer_done':
      await markTransferDone(db, action.transferId);
      return null;
    case 'transfer_undo':
      await undoTransferDone(db, action.transferId, newId);
      return null;
    case 'reschedule':
      await rescheduleTransfer(db, action.transferId, action.date);
      return null;
    case 'payday_done':
      return markPaydayDone(db, action.period, newId);
    case 'payday_undo':
      await undoPayday(db, action.transferId);
      return null;
    case 'residual':
      await returnResidual(db, action.amountCents, todayIn(), newId);
      return null;
  }
}

export function usePlanAction() {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: PlanAction) => execute(db, action),
    onSuccess: () =>
      Promise.all(
        [subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}
