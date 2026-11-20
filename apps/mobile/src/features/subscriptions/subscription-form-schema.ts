import type { PeriodUnit } from '@abonnements/core';
import { z } from 'zod';

export const PERIODICITIES = [
  { key: 'week', label: 'Hebdomadaire', unit: 'week', count: 1 },
  { key: 'month', label: 'Mensuel', unit: 'month', count: 1 },
  { key: 'quarter', label: 'Trimestriel', unit: 'month', count: 3 },
  { key: 'half', label: 'Semestriel', unit: 'month', count: 6 },
  { key: 'year', label: 'Annuel', unit: 'year', count: 1 },
  { key: 'biennial', label: 'Tous les 2 ans', unit: 'year', count: 2 },
] as const satisfies readonly { key: string; label: string; unit: PeriodUnit; count: number }[];

export type PeriodicityKey = (typeof PERIODICITIES)[number]['key'];

export function periodicityKeyOf(unit: PeriodUnit, count: number): PeriodicityKey {
  return PERIODICITIES.find((p) => p.unit === unit && p.count === count)?.key ?? 'month';
}

export function periodicityOf(key: PeriodicityKey) {
  return PERIODICITIES.find((p) => p.key === key) ?? PERIODICITIES[1];
}

const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;

export function parseAmountCents(value: string): number {
  const [euros = '0', cents = ''] = value.trim().replace('.', ',').split(',');
  return Number(euros) * 100 + Number(cents.padEnd(2, '0'));
}

export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}

export function subscriptionFormSchema(today: string, options: { allowPastDate?: boolean } = {}) {
  return z.object({
    name: z.string().trim().min(1, 'Indique le nom de l’abonnement').max(100, '100 caractères maximum'),
    amount: z
      .string()
      .regex(AMOUNT, 'Montant invalide, par exemple 9,99')
      .refine((v) => parseAmountCents(v) > 0, 'Le montant doit être supérieur à 0'),
    periodicity: z.enum(PERIODICITIES.map((p) => p.key) as [PeriodicityKey, ...PeriodicityKey[]]),
    status: z.enum(['trial', 'active']),
    firstChargeDate: z.string().refine((d) => options.allowPastDate || d >= today, 'La date ne peut pas être passée'),
    categoryId: z.string(),
    iconKey: z.string().nullable(),
    cancelUrl: z
      .string()
      .trim()
      .refine((v) => v === '' || /^https:\/\/[^\s]+\.[^\s]+$/.test(v), 'Le lien doit commencer par https://'),
    marginOverrideBp: z.number().int().min(0).max(500).nullable(),
    paymentMethod: z.enum(['revolut', 'other']),
    notes: z.string().max(1000, '1000 caractères maximum'),
  });
}

export type SubscriptionFormValues = z.infer<ReturnType<typeof subscriptionFormSchema>>;
