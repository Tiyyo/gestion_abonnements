import { generateCharges, planRegeneration } from '@abonnements/core';
import type { Executor, NewId } from '@/db/executor';
import { toSnapshot, toStoredCharge } from './to-snapshot';

export async function syncSubscriptionCharges(trx: Executor, subscriptionId: string, today: string, newId: NewId): Promise<void> {
  const settings = await trx.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
  const stored = await trx.selectFrom('charge').selectAll().where('subscription_id', '=', subscriptionId).execute();

  const expected = generateCharges(toSnapshot(row), { today, globalMarginBp: settings.global_margin_bp });
  const plan = planRegeneration(subscriptionId, stored.map(toStoredCharge), expected);

  for (const charge of plan.create) {
    await trx
      .insertInto('charge')
      .values({
        id: newId(),
        subscription_id: charge.subscriptionId,
        due_date: charge.dueDate,
        expected_amount_cents: charge.expectedAmountCents,
        funded_amount_cents: charge.fundedAmountCents,
        status: charge.status,
        is_trial_conversion: charge.isTrialConversion ? 1 : 0,
      })
      .execute();
  }
  for (const update of plan.update) {
    await trx
      .updateTable('charge')
      .set({
        expected_amount_cents: update.expectedAmountCents,
        funded_amount_cents: update.fundedAmountCents,
        status: update.status,
        is_trial_conversion: update.isTrialConversion ? 1 : 0,
      })
      .where('id', '=', update.id)
      .execute();
  }
  if (plan.remove.length > 0) {
    await trx.deleteFrom('charge').where('id', 'in', plan.remove).execute();
  }
  if (plan.skip.length > 0) {
    await trx.updateTable('charge').set({ status: 'skipped' }).where('id', 'in', plan.skip).execute();
  }
}
