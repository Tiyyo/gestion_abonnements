import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { readBalancesConfig } from './function-config';

const money = z.object({ amountCents: z.number().int(), currency: z.string().length(3) });

export const balancesResponseSchema = z.object({
  current: money,
  vault: money,
  consentValidUntil: z.string().datetime({ offset: true }),
  fetchedAt: z.string().datetime({ offset: true }),
});

export type Balances = z.infer<typeof balancesResponseSchema>;

export class ConsentExpiredError extends Error {
  constructor() {
    super('Accord bancaire à renouveler');
  }
}

const TIMEOUT_MS = 12000;
export const RENEWAL_NOTICE_DAYS = 14;

export async function fetchBalances(config: { url: string; secret: string }, fetchImpl: typeof fetch = fetch): Promise<Balances> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(config.url, {
      headers: { Authorization: `Bearer ${config.secret}` },
      signal: controller.signal,
    });
    if (response.status === 409) {
      throw new ConsentExpiredError();
    }
    if (!response.ok) {
      throw new Error(`soldes indisponibles (${response.status})`);
    }
    return balancesResponseSchema.parse(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

export function daysUntil(isoDateTime: string, now: Date): number {
  return Math.floor((new Date(isoDateTime).getTime() - now.getTime()) / 86_400_000);
}

export function vaultShortfallCents(vaultCents: number, pendingTransfersCents: number): number {
  return Math.max(0, pendingTransfersCents - vaultCents);
}

export const balancesKey = ['balances'] as const;

export function useBalances() {
  const config = readBalancesConfig();
  return useQuery({
    queryKey: balancesKey,
    queryFn: () => {
      if (!config) {
        throw new Error('connexion non configurée');
      }
      return fetchBalances(config);
    },
    enabled: !!config,
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: (count, error) => !(error instanceof ConsentExpiredError) && count < 1,
  });
}
