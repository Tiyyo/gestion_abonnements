import { normalizeName } from '@abonnements/core';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { correctionsRepository } from '@/db/repositories/subscriptions';
import { matchBrand } from '@/features/enrich/brands';
import { localSuggestion, type Suggestion } from '@/features/enrich/suggestion';

/** Correction apprise, sinon marque reconnue : réponse immédiate, sans réseau, qui n'attend pas /enrich. */
export function useLocalSuggestion(name: string) {
  const db = useDb();
  const key = normalizeName(name);
  return useQuery({
    queryKey: ['suggestion', 'local', key],
    enabled: key.length >= 2,
    queryFn: async (): Promise<Suggestion | null> => localSuggestion(await correctionsRepository(db).find(name), matchBrand(name)),
  });
}
