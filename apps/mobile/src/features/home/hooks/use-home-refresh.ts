import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { balancesKey } from '@/features/balances/query-keys';

/** Tirer pour actualiser : recharge l'Accueil et relit les soldes Revolut. */
export function useHomeRefresh(refetchHome: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    Promise.all([refetchHome(), queryClient.refetchQueries({ queryKey: balancesKey })]).finally(() => setRefreshing(false));
  };
  return { refreshing, refresh };
}
