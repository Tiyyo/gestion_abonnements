import { type Balances, balancesResponseSchema } from './balances-schema';
import { ConsentExpiredError } from './consent-expired-error';

const TIMEOUT_MS = 12000;

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
