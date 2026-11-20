import { normalizeName } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { correctionsRepository } from '@/db/repositories/subscriptions';
import { matchBrand } from '@/features/enrich/brands';
import { callEnrich, readEnrichConfig } from '@/features/enrich/enrich-client';
import { fromBrand, fromCorrection, fromEnrich, type Suggestion } from '@/features/enrich/suggestion';

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
        return fromCorrection(correction);
      }
      const config = aiEnabled ? readEnrichConfig() : null;
      const ai = config ? await callEnrich(name, config) : null;
      if (ai) {
        return fromEnrich(ai);
      }
      const brand = matchBrand(name);
      return brand ? fromBrand(brand) : null;
    },
  });
}
