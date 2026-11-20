import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { resyncAll } from '@/db/sync/resync';
import type { DB, Settings, SettingsUpdate } from '@/db/types';

const PLAN_FIELDS = ['payday_day', 'global_margin_bp', 'funding_lead_days'] as const;

export function settingsRepository(db: Kysely<DB>) {
  return {
    get(): Promise<Settings> {
      return db.selectFrom('settings').selectAll().where('id', '=', 1).executeTakeFirstOrThrow();
    },
    async update(patch: SettingsUpdate, today: string, newId: NewId): Promise<void> {
      await db.transaction().execute(async (trx) => {
        await trx.updateTable('settings').set(patch).where('id', '=', 1).execute();
        if (PLAN_FIELDS.some((field) => field in patch)) {
          await resyncAll(trx, today, newId);
        }
      });
    },
  };
}
