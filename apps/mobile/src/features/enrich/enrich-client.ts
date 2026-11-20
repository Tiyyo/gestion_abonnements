import { readFunctionConfig } from '@/config/function-config';
import { type EnrichResponse, enrichResponseSchema } from './enrich-schema';

const TIMEOUT_MS = 6000;

export const readEnrichConfig = readFunctionConfig;

export async function callEnrich(
  name: string,
  config: { url: string; secret: string },
  fetchImpl: typeof fetch = fetch,
): Promise<EnrichResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.secret}` },
      body: JSON.stringify({ name: name.trim().slice(0, 100) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const parsed = enrichResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
