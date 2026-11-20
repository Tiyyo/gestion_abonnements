import { z } from 'zod';

const money = z.object({ amountCents: z.number().int(), currency: z.string().length(3) });

export const balancesResponseSchema = z.object({
  current: money,
  vault: money,
  consentValidUntil: z.string().datetime({ offset: true }),
  fetchedAt: z.string().datetime({ offset: true }),
});

export type Balances = z.infer<typeof balancesResponseSchema>;
