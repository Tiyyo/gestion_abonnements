import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';

export async function rescheduleTransfer(db: Kysely<DB>, transferId: string, date: string | null): Promise<void> {
  await db.updateTable('transfer').set({ rescheduled_date: date }).where('id', '=', transferId).where('status', '=', 'planned').execute();
}
