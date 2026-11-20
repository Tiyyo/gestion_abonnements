import { groupTransfers } from '@abonnements/core';
import type { Executor, NewId } from '@/db/executor';
import { keptRescheduledDate } from './kept-reschedule';

export async function syncTransfers(trx: Executor, newId: NewId): Promise<void> {
  const settings = await trx.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const charges = await trx
    .selectFrom('charge')
    .select(['id', 'due_date', 'funded_amount_cents', 'status'])
    .where('status', '=', 'planned')
    .where('provision_only', '=', 0)
    .execute();
  const groups = groupTransfers(
    charges.map((c) => ({ id: c.id, dueDate: c.due_date, fundedAmountCents: c.funded_amount_cents, status: c.status })),
    settings.funding_lead_days,
  );

  const planned = await trx
    .selectFrom('transfer')
    .selectAll()
    .where('type', '=', 'vault_to_main')
    .where('status', '=', 'planned')
    .execute();
  const byDate = new Map(planned.map((t) => [t.planned_date, t]));

  if (planned.length > 0) {
    await trx
      .deleteFrom('transfer_charge')
      .where(
        'transfer_id',
        'in',
        planned.map((t) => t.id),
      )
      .execute();
  }

  const kept = new Set<string>();
  for (const group of groups) {
    const existing = byDate.get(group.plannedDate);
    let transferId: string;
    if (existing) {
      transferId = existing.id;
      const rescheduled = keptRescheduledDate(
        existing.rescheduled_date,
        group.charges.map((c) => c.dueDate),
        group.plannedDate,
      );
      await trx
        .updateTable('transfer')
        .set({ amount_cents: group.amountCents, rescheduled_date: rescheduled })
        .where('id', '=', transferId)
        .execute();
    } else {
      transferId = newId();
      await trx
        .insertInto('transfer')
        .values({ id: transferId, type: 'vault_to_main', planned_date: group.plannedDate, amount_cents: group.amountCents })
        .execute();
    }
    kept.add(transferId);
    await trx
      .insertInto('transfer_charge')
      .values(group.charges.map((c) => ({ transfer_id: transferId, charge_id: c.id, amount_cents: c.fundedAmountCents })))
      .execute();
  }

  const obsolete = planned.filter((t) => !kept.has(t.id)).map((t) => t.id);
  if (obsolete.length > 0) {
    await trx.deleteFrom('transfer').where('id', 'in', obsolete).execute();
  }
}
