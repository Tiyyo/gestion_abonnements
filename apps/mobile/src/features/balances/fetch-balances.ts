import { type Balances, balancesResponseSchema } from './balances-schema';
import { ConsentExpiredError } from './consent-expired-error';

const TIMEOUT_MS = 12000;

/** Session et comptes renouvelés depuis l'app ; sans eux, la fonction lit ceux de sa configuration. */
export type BalancesTarget = { sessionId: string; currentUid: string; vaultUid: string };

export function balancesHeaders(secret: string, target: BalancesTarget | null): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${secret}` };
  if (target) {
    headers['X-Sluis-Session'] = target.sessionId;
    headers['X-Sluis-Account-Current'] = target.currentUid;
    headers['X-Sluis-Account-Vault'] = target.vaultUid;
  }
  return headers;
}

export async function fetchBalances(
  config: { url: string; secret: string },
  target: BalancesTarget | null = null,
  fetchImpl: typeof fetch = fetch,
): Promise<Balances> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(config.url, {
      headers: balancesHeaders(config.secret, target),
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
