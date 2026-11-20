import { isInPeriod, residualToReturn } from '@abonnements/core';
import type { Kysely } from 'kysely';
import { loadLedger } from '@/db/repositories/ledger';
import type { DB } from '@/db/types';
import { loadPayday } from './load-payday';
import { periodForMonth } from './period';
import { loadTrials } from './trials';
import type { MonthPlan } from './types';
import { loadVaultTransfers } from './vault-transfers';

export async function loadMonthPlan(db: Kysely<DB>, year: number, month: number, today: string): Promise<MonthPlan> {
  const settings = await db.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const period = periodForMonth(year, month, settings.payday_day);
  const ledger = await loadLedger(db);
  const [payday, transfers, trials] = await Promise.all([
    loadPayday(db, period),
    loadVaultTransfers(db, settings.global_margin_bp, (t) => isInPeriod(t.effective, period)),
    loadTrials(db, today, ledger, period),
  ]);
  return {
    period,
    globalMarginBp: settings.global_margin_bp,
    payday,
    transfers,
    trials,
    residualCents: isInPeriod(today, period) ? residualToReturn(ledger, today) : null,
  };
}
