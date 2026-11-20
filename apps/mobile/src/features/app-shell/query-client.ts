import { MutationCache, QueryClient } from '@tanstack/react-query';
import { requestReschedule } from '@/notifications/scheduler';

/** Client TanStack Query de l'app : toute mutation réussie replanifie les notifications locales. */
export function createQueryClient(): QueryClient {
  return new QueryClient({ mutationCache: new MutationCache({ onSuccess: () => requestReschedule() }) });
}
