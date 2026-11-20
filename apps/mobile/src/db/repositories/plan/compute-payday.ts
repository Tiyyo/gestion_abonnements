import { type PaydayPeriod, paydayPlan } from '@abonnements/core';
import type { Executor } from '@/db/executor';
import { paydayBreakdown, paydayInputs } from './payday-breakdown';
import type { PaydayBreakdownLine } from './types';

export async function computePayday(trx: Executor, period: PaydayPeriod): Promise<{ totalCents: number; lines: PaydayBreakdownLine[] }> {
  const settings = await trx.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const rows = await trx
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select([
      'charge.subscription_id',
      'charge.due_date',
      'charge.funded_amount_cents',
      'charge.status',
      'charge.provision_only',
      'charge.actual_date',
      'subscription.name',
      'subscription.period_unit',
      'subscription.period_count',
    ])
    .where('subscription.archived_at', 'is', null)
    .execute();

  const names = new Map(rows.map((r) => [r.subscription_id, r.name]));
  const plan = paydayPlan({ period, fundingLeadDays: settings.funding_lead_days, ...paydayInputs(rows) });
  return paydayBreakdown(plan, names);
}
