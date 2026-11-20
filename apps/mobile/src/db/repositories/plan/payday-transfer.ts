import type { Executor } from '@/db/executor';
import type { Transfer } from '@/db/types';

/** Virement de paie déjà enregistré pour la période qui commence à `start`. */
export function findPaydayTransfer(db: Executor, start: string): Promise<Transfer | undefined> {
  return db.selectFrom('transfer').selectAll().where('type', '=', 'payday').where('planned_date', '=', start).executeTakeFirst();
}
