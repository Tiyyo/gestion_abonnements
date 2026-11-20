import { useQuery } from '@tanstack/react-query';
import { readBalancesConfig } from '@/config/function-config';
import { ConsentExpiredError } from '@/features/balances/consent-expired-error';
import { fetchBalances } from '@/features/balances/fetch-balances';
import { balancesKey } from '@/features/balances/query-keys';

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
