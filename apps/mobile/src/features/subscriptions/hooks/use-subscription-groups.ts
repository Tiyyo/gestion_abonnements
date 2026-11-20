import { useMemo } from 'react';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { buildSubscriptionView, type SubscriptionSort } from '@/features/subscriptions/subscription-view';
import { useSubscriptions } from './use-subscriptions';

/** Abonnements de l'onglet : recherche et tri appliqués, groupes en cours par urgence, résiliés à part, marge globale pour les provisions. */
export function useSubscriptionGroups(query: string, sort: SubscriptionSort) {
  const subscriptions = useSubscriptions();
  const settings = useSettings();
  const rows = useMemo(() => subscriptions.data ?? [], [subscriptions.data]);
  const view = useMemo(() => buildSubscriptionView(rows, { query, sort }), [rows, query, sort]);
  const ongoingCount = useMemo(() => rows.filter((r) => r.status !== 'cancelled').length, [rows]);
  return {
    isPending: subscriptions.isPending,
    isEmpty: rows.length === 0,
    view,
    ongoingCount,
    globalMarginBp: settings.data?.global_margin_bp ?? 0,
  };
}
