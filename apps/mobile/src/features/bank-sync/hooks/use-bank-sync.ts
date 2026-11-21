import { todayIn } from '@abonnements/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Kysely } from 'kysely';
import { readTransactionsConfig } from '@/config/function-config';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import type { BankSyncResult } from '@/db/reconcile/bank/apply-bank-transactions';
import type { DB } from '@/db/types';
import { runBankSync } from '@/features/bank-sync/run-bank-sync';
import { useInvalidateAll } from '@/features/home/hooks/use-invalidate-all';
import { requestReschedule } from '@/notifications/scheduler';

/** Au retour au premier plan, on ne relit pas le compte plus d'une fois par quart d'heure. */
const MIN_INTERVAL_MS = 15 * 60 * 1000;

let inFlight: Promise<BankSyncResult | null> | null = null;
let lastAttemptAt = 0;

/** Une seule lecture à la fois : un second appel pendant une lecture attend la même. */
function syncOnce(db: Kysely<DB>, force: boolean): Promise<BankSyncResult | null> {
  const config = readTransactionsConfig();
  if (!config) {
    return Promise.resolve(null);
  }
  if (inFlight) {
    return inFlight;
  }
  if (!force && Date.now() - lastAttemptAt < MIN_INTERVAL_MS) {
    return Promise.resolve(null);
  }
  lastAttemptAt = Date.now();
  inFlight = runBankSync(db, { config, today: todayIn(), newId }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Rapprochement automatique : relit les débits Revolut et rafraîchit les écrans.
 * `force` (tirer pour actualiser) ignore le délai minimal entre deux lectures.
 */
export function useBankSync() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ force }: { force: boolean }) => syncOnce(db, force),
    onSuccess: async (result) => {
      if (!result) {
        return;
      }
      await Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ['settings'] })]);
      if (result.applied > 0) {
        requestReschedule();
      }
    },
  });
}
