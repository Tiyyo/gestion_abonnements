import { addDays, normalizeName, todayIn } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useDb } from '../db/provider';
import { correctionsRepository } from '../db/repositories/subscriptions';
import { categoryIdFor, isBrandIconKey, matchBrand } from './brands';
import { readFunctionConfig } from './function-config';

export const CATEGORY_NAMES = [
  'Musique',
  'Vidéo',
  'Stockage cloud',
  'Jeux',
  'Productivité',
  'Presse',
  'Santé/Sport',
  'IA',
  'Autre',
] as const;

export const enrichResponseSchema = z
  .object({
    category: z.enum(CATEGORY_NAMES),
    iconKey: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .nullable(),
    cancelUrl: z.string().url().startsWith('https://').nullable(),
    trialDays: z.number().int().min(0).max(365).nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type EnrichResponse = z.infer<typeof enrichResponseSchema>;

export interface Suggestion {
  source: 'correction' | 'brand' | 'ai';
  categoryId: string;
  iconKey: string | null;
  cancelUrl: string | null;
  trialDays: number | null;
}

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

export function fromEnrich(response: EnrichResponse): Suggestion {
  return {
    source: 'ai',
    categoryId: categoryIdFor(response.category),
    iconKey: isBrandIconKey(response.iconKey) ? response.iconKey : null,
    cancelUrl: response.cancelUrl,
    trialDays: response.trialDays,
  };
}

/** `aiEnabled` à false (interrupteur des Réglages) : rien n'est envoyé à /enrich, seules les corrections et les marques connues servent. */
export function useSuggestion(name: string, aiEnabled = true) {
  const db = useDb();
  const key = normalizeName(name);
  return useQuery({
    queryKey: ['suggestion', key, aiEnabled],
    enabled: key.length >= 2,
    staleTime: Infinity,
    queryFn: async (): Promise<Suggestion | null> => {
      const correction = await correctionsRepository(db).find(name);
      if (correction) {
        return {
          source: 'correction',
          categoryId: correction.category_id,
          iconKey: isBrandIconKey(correction.icon_key) ? correction.icon_key : null,
          cancelUrl: null,
          trialDays: null,
        };
      }
      const config = aiEnabled ? readEnrichConfig() : null;
      const ai = config ? await callEnrich(name, config) : null;
      if (ai) {
        return fromEnrich(ai);
      }
      const brand = matchBrand(name);
      return brand ? { source: 'brand', categoryId: brand.categoryId, iconKey: brand.iconKey, cancelUrl: null, trialDays: null } : null;
    },
  });
}

export function trialEndFrom(trialDays: number | null, fallbackDays: number): string {
  return addDays(todayIn(), trialDays && trialDays > 0 ? trialDays : fallbackDays);
}
