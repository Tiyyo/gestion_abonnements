import { addDays, formatEuros } from '@abonnements/core';
import type { NewSubscriptionInput, SubscriptionEdit, SubscriptionRow } from '@/db/repositories/subscriptions';
import { dateShort } from '@/lib/dates';
import { centsToInput, parseAmountCents, periodicityKeyOf, periodicityOf, type SubscriptionFormValues } from './subscription-form-schema';

export const DEFAULT_TRIAL_DAYS = 30;

/** Catégorie et logo choisis à la main : mémorisés pour corriger les suggestions suivantes. */
export interface Correction {
  categoryId: string;
  iconKey: string;
}

/** Valeurs initiales d'un nouvel abonnement, éventuellement préremplies (prélèvement inconnu). */
export function newSubscriptionDefaults(params: { name?: string; amount?: string; date?: string }, today: string): SubscriptionFormValues {
  return {
    name: params.name ?? '',
    amount: params.amount ?? '',
    periodicity: 'month',
    status: params.date ? 'active' : 'trial',
    firstChargeDate: params.date && params.date >= today ? params.date : params.date ? today : addDays(today, DEFAULT_TRIAL_DAYS),
    categoryId: 'cat-autre',
    iconKey: null,
    cancelUrl: '',
    marginOverrideBp: null,
    paymentMethod: 'revolut',
    notes: '',
  };
}

/** Valeurs du formulaire de modification ; un essai montre le montant après l'essai et sa date de fin. */
export function editSubscriptionDefaults(row: SubscriptionRow): SubscriptionFormValues {
  return {
    name: row.name,
    amount: centsToInput(row.status === 'trial' ? (row.post_trial_amount_cents ?? row.amount_cents) : row.amount_cents),
    periodicity: periodicityKeyOf(row.period_unit, row.period_count),
    status: row.status === 'trial' ? 'trial' : 'active',
    firstChargeDate: row.status === 'trial' ? (row.trial_end_date ?? row.next_charge_date) : row.next_charge_date,
    categoryId: row.category_id,
    iconKey: row.icon_key === 'tag' ? null : row.icon_key,
    cancelUrl: row.cancel_url ?? '',
    marginOverrideBp: row.margin_override_bp,
    paymentMethod: row.payment_method,
    notes: row.notes ?? '',
  };
}

export function toNewSubscriptionInput(values: SubscriptionFormValues, aiSuggestion: string | null): NewSubscriptionInput {
  const periodicity = periodicityOf(values.periodicity);
  return {
    name: values.name,
    amountCents: parseAmountCents(values.amount),
    periodUnit: periodicity.unit,
    periodCount: periodicity.count,
    status: values.status,
    firstChargeDate: values.firstChargeDate,
    categoryId: values.categoryId,
    iconKey: values.iconKey,
    cancelUrl: values.cancelUrl || null,
    aiSuggestion,
  };
}

export function toSubscriptionEdit(values: SubscriptionFormValues) {
  const periodicity = periodicityOf(values.periodicity);
  return {
    name: values.name,
    amountCents: parseAmountCents(values.amount),
    periodUnit: periodicity.unit,
    periodCount: periodicity.count,
    date: values.firstChargeDate,
    categoryId: values.categoryId,
    iconKey: values.iconKey,
    cancelUrl: values.cancelUrl || null,
    marginOverrideBp: values.marginOverrideBp,
    paymentMethod: values.paymentMethod,
    notes: values.notes.trim() || null,
  } satisfies SubscriptionEdit;
}

/** Une modification qui change le montant, la marge, le rythme, le moyen de paiement ou la date touche au plan. */
export function touchesPlan(edit: ReturnType<typeof toSubscriptionEdit>, row: SubscriptionRow): boolean {
  return (
    edit.amountCents !== row.amount_cents ||
    edit.marginOverrideBp !== row.margin_override_bp ||
    edit.periodUnit !== row.period_unit ||
    edit.periodCount !== row.period_count ||
    edit.paymentMethod !== row.payment_method ||
    edit.date !== row.next_charge_date
  );
}

export function fundedChargesWarning(funded: readonly { due_date: string; funded_amount_cents: number }[]): string {
  return `${funded.map((c) => `Le prélèvement du ${dateShort(c.due_date)} est déjà alimenté (${formatEuros(c.funded_amount_cents)}) : il ne change pas.`).join('\n')}\nLes prélèvements suivants seront recalculés.`;
}
