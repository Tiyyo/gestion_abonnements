import type { PaydayPeriod } from '@abonnements/core';
import { todayIn } from '@abonnements/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  markPaydayDone,
  markTransferDone,
  rescheduleTransfer,
  returnResidual,
  undoPayday,
  undoTransferDone,
} from '../db/commands';
import { newId } from '../db/id';
import { useDb } from '../db/provider';
import { loadMonthPlan } from '../db/repositories/plan';
import { subscriptionsKey } from './subscriptions';

export function useMonthPlan(year: number, month: number) {
  const db = useDb();
  return useQuery({ queryKey: ['plan', year, month], queryFn: () => loadMonthPlan(db, year, month, todayIn()) });
}

type PlanAction =
  | { type: 'transfer_done'; transferId: string }
  | { type: 'transfer_undo'; transferId: string }
  | { type: 'reschedule'; transferId: string; date: string | null }
  | { type: 'payday_done'; period: PaydayPeriod }
  | { type: 'payday_undo'; transferId: string }
  | { type: 'residual'; amountCents: number };

export function usePlanAction() {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: PlanAction) => {
      switch (action.type) {
        case 'transfer_done':
          return markTransferDone(db, action.transferId);
        case 'transfer_undo':
          return undoTransferDone(db, action.transferId, newId);
        case 'reschedule':
          return rescheduleTransfer(db, action.transferId, action.date);
        case 'payday_done':
          return markPaydayDone(db, action.period, newId);
        case 'payday_undo':
          return undoPayday(db, action.transferId);
        case 'residual':
          return returnResidual(db, action.amountCents, todayIn(), newId);
      }
    },
    onSuccess: () =>
      Promise.all([subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}
