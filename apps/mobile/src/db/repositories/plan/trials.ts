import { forgottenTrialRisk, isInPeriod, type Ledger, type PaydayPeriod, projectedBalance } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import type { PlanTrial } from './types';

/** Conversions d'essai à venir, non financées : solde projeté et risque d'essai oublié. */
export async function loadTrials(db: Kysely<DB>, today: string, ledger: Ledger, period?: PaydayPeriod): Promise<PlanTrial[]> {
  const conversions = await db
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .selectAll('charge')
    .select('subscription.name')
    .where('charge.is_trial_conversion', '=', 1)
    .where('charge.status', '=', 'unfunded')
    .where('subscription.status', '=', 'trial')
    .where('subscription.archived_at', 'is', null)
    .where('charge.due_date', '>=', today)
    .orderBy('charge.due_date')
    .execute();
  return conversions
    .filter((c) => !period || isInPeriod(c.due_date, period))
    .map((c) => ({
      subscriptionId: c.subscription_id,
      name: c.name,
      dueDate: c.due_date,
      amountCents: c.expected_amount_cents,
      projectedCents: projectedBalance(ledger, today, c.due_date),
      risk: forgottenTrialRisk(ledger, today, {
        status: c.status,
        dueDate: c.due_date,
        fundedAmountCents: c.funded_amount_cents,
        expectedAmountCents: c.expected_amount_cents,
        actualAmountCents: c.actual_amount_cents,
        actualDate: c.actual_date,
        provisionOnly: false,
      }),
    }));
}
