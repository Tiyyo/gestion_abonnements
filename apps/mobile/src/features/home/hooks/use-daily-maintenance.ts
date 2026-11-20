import { todayIn } from '@abonnements/core';
import { useEffect } from 'react';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { runDailyMaintenance } from '@/db/reconcile/daily-maintenance';
import { useInvalidateAll } from './use-invalidate-all';

let maintenanceDay: string | null = null;

export function useDailyMaintenance() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  useEffect(() => {
    const today = todayIn();
    if (maintenanceDay === today) {
      return;
    }
    maintenanceDay = today;
    runDailyMaintenance(db, today, newId)
      .then((changed) => (changed > 0 ? invalidate() : undefined))
      .catch(() => {
        maintenanceDay = null;
      });
  });
}
