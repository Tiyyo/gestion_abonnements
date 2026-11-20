import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const transaction = z
  .object({
    id: z.string().min(1).max(200),
    bookingDate: isoDate,
    amountCents: z.number().int().nonnegative(),
    currency: z.string().length(3),
    direction: z.enum(['debit', 'credit']),
    status: z.enum(['booked', 'pending']),
    label: z.string().max(140),
    remittance: z.string().max(140).nullable(),
  })
  .strict();

/** Réponse de `GET /transactions` (contrat : `contracts/transactions.schema.json`). */
export const transactionsResponseSchema = z
  .object({
    from: isoDate,
    complete: z.boolean(),
    transactions: z.array(transaction),
    fetchedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type TransactionsResponse = z.infer<typeof transactionsResponseSchema>;
