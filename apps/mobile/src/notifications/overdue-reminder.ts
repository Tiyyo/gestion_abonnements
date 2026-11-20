import { compareDates } from '@abonnements/core';
import type { Kysely } from 'kysely';
import { settingsRepository } from '@/db/repositories/settings';
import { loadVaultTransfers } from '@/db/repositories/plan/vault-transfers';
import type { DB } from '@/db/types';
import { overdueNotification } from './transfer-reminders';
import type { PlannedNotification } from './types';

export async function overdueReminder(db: Kysely<DB>, today: string): Promise<PlannedNotification | null> {
  const settings = await settingsRepository(db).get();
  const overdue = await loadVaultTransfers(
    db,
    settings.global_margin_bp,
    (t) => t.status === 'planned' && compareDates(t.effective, today) < 0,
  );
  return overdueNotification(overdue, today);
}
