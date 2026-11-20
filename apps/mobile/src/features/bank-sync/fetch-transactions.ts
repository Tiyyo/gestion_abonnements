import { ConsentExpiredError } from '@/features/balances/consent-expired-error';
import { type TransactionsResponse, transactionsResponseSchema } from './transactions-schema';

const TIMEOUT_MS = 20000;

/** Mouvements du compte principal depuis `from` (AAAA-MM-JJ). Une réponse hors contrat est refusée en bloc. */
export async function fetchTransactions(
  config: { url: string; secret: string },
  from: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TransactionsResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const separator = config.url.includes('?') ? '&' : '?';
    const response = await fetchImpl(`${config.url}${separator}from=${encodeURIComponent(from)}`, {
      headers: { Authorization: `Bearer ${config.secret}` },
      signal: controller.signal,
    });
    if (response.status === 409) {
      throw new ConsentExpiredError();
    }
    if (!response.ok) {
      throw new Error(`mouvements indisponibles (${response.status})`);
    }
    return transactionsResponseSchema.parse(await response.json());
  } finally {
    clearTimeout(timer);
  }
}
