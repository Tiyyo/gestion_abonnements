import { MutationCache, QueryClient } from '@tanstack/react-query';
import { requestReschedule } from '@/notifications/scheduler';
import { requestWidgetRefresh } from '@/features/widget/refresher';

/** Client TanStack Query de l'app : toute mutation réussie replanifie les notifications locales et met à jour le widget. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: () => {
        requestReschedule();
        requestWidgetRefresh();
      },
    }),
  });
}
