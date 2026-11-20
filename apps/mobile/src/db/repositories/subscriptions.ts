import { normalizeName, type PaymentMethod, type PeriodUnit, type SubscriptionStatus } from '@abonnements/core';
import type { Executor } from '@/db/executor';
import { nowIso } from '@/db/now-iso';
import type { Subscription } from '@/db/types';

export type SubscriptionRow = Subscription & { category_name: string };

export interface SubscriptionFields {
  name: string;
  categoryId?: string;
  iconKey?: string | null;
  amountCents: number;
  periodUnit: PeriodUnit;
  periodCount: number;
  cancelUrl?: string | null;
  marginOverrideBp?: number | null;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}

export interface NewSubscriptionInput extends SubscriptionFields {
  status: Extract<SubscriptionStatus, 'trial' | 'active'>;
  firstChargeDate: string;
  aiSuggestion?: string | null;
}

export interface SubscriptionEdit extends SubscriptionFields {
  date: string;
}

const anchorOf = (unit: PeriodUnit, date: string) => (unit === 'week' ? null : Number(date.slice(8, 10)));

export function subscriptionsRepository(db: Executor) {
  const base = () =>
    db
      .selectFrom('subscription')
      .innerJoin('category', 'category.id', 'subscription.category_id')
      .selectAll('subscription')
      .select('category.name as category_name')
      .where('subscription.archived_at', 'is', null);

  return {
    list(): Promise<SubscriptionRow[]> {
      return base().orderBy('subscription.name').execute();
    },
    get(id: string): Promise<SubscriptionRow | undefined> {
      return base().where('subscription.id', '=', id).executeTakeFirst();
    },
    async insert(id: string, input: NewSubscriptionInput): Promise<void> {
      const trial = input.status === 'trial';
      await db
        .insertInto('subscription')
        .values({
          id,
          name: input.name.trim(),
          category_id: input.categoryId ?? 'cat-autre',
          icon_key: input.iconKey ?? 'tag',
          amount_cents: input.amountCents,
          period_unit: input.periodUnit,
          period_count: input.periodCount,
          anchor_day: anchorOf(input.periodUnit, input.firstChargeDate),
          next_charge_date: input.firstChargeDate,
          status: input.status,
          trial_end_date: trial ? input.firstChargeDate : null,
          post_trial_amount_cents: trial ? input.amountCents : null,
          cancel_url: input.cancelUrl ?? null,
          margin_override_bp: input.marginOverrideBp ?? null,
          payment_method: input.paymentMethod ?? 'revolut',
          notes: input.notes ?? null,
          ai_suggestion: input.aiSuggestion ?? null,
        })
        .execute();
    },
    async update(row: Subscription, edit: SubscriptionEdit): Promise<void> {
      const dateChanged = edit.date !== (row.status === 'trial' ? row.trial_end_date : row.next_charge_date);
      const periodChanged = edit.periodUnit !== row.period_unit || edit.periodCount !== row.period_count;
      const schedule =
        row.status === 'cancelled'
          ? {}
          : row.status === 'trial'
            ? { trial_end_date: edit.date, next_charge_date: edit.date, post_trial_amount_cents: edit.amountCents }
            : { next_charge_date: edit.date };
      await db
        .updateTable('subscription')
        .set({
          name: edit.name.trim(),
          category_id: edit.categoryId ?? row.category_id,
          icon_key: edit.iconKey ?? 'tag',
          amount_cents: edit.amountCents,
          period_unit: edit.periodUnit,
          period_count: edit.periodCount,
          anchor_day: dateChanged || periodChanged ? anchorOf(edit.periodUnit, edit.date) : row.anchor_day,
          cancel_url: edit.cancelUrl ?? null,
          margin_override_bp: edit.marginOverrideBp ?? null,
          payment_method: edit.paymentMethod ?? row.payment_method,
          notes: edit.notes ?? null,
          ...schedule,
        })
        .where('id', '=', row.id)
        .execute();
    },
  };
}

/** Essais et abonnements à résilier : ceux qui attendent une décision (rappels de notification). */
export function subscriptionsAwaitingDecision(db: Executor): Promise<Subscription[]> {
  return db.selectFrom('subscription').selectAll().where('archived_at', 'is', null).where('status', 'in', ['trial', 'to_cancel']).execute();
}

export function correctionsRepository(db: Executor) {
  return {
    find(name: string) {
      return db.selectFrom('ai_correction').selectAll().where('name_normalized', '=', normalizeName(name)).executeTakeFirst();
    },
    async save(name: string, categoryId: string, iconKey: string): Promise<void> {
      await db
        .insertInto('ai_correction')
        .values({ name_normalized: normalizeName(name), category_id: categoryId, icon_key: iconKey })
        .onConflict((oc) =>
          oc.column('name_normalized').doUpdateSet({ category_id: categoryId, icon_key: iconKey, corrected_at: nowIso() }),
        )
        .execute();
    },
  };
}
