import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useBankSync } from '@/features/bank-sync/hooks/use-bank-sync';
import { balancesKey } from '@/features/balances/query-keys';

/** Tirer pour actualiser : relit les débits et les soldes Revolut, puis recharge l'Accueil (même si la lecture échoue). */
export function useHomeRefresh(refetchHome: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  const { mutateAsync: syncBank } = useBankSync();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    const reconciled = syncBank({ force: true })
      .catch(() => null)
      .then(() => refetchHome());
    Promise.all([reconciled, queryClient.refetchQueries({ queryKey: balancesKey })]).finally(() => setRefreshing(false));
  };
  return { refreshing, refresh };
}
