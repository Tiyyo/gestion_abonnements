import { useMemo } from 'react';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { cancelledByName, groupByStatus } from '@/features/subscriptions/subscription-groups';
import { useSubscriptions } from './use-subscriptions';

/** Abonnements de l'onglet : groupes en cours par urgence, résiliés à part, marge globale pour les provisions. */
export function useSubscriptionGroups() {
  const subscriptions = useSubscriptions();
  const settings = useSettings();
  const rows = useMemo(() => subscriptions.data ?? [], [subscriptions.data]);
  const groups = useMemo(() => groupByStatus(rows), [rows]);
  const cancelled = useMemo(() => cancelledByName(rows), [rows]);
  return {
    isPending: subscriptions.isPending,
    isEmpty: rows.length === 0,
    groups,
    cancelled,
    ongoingCount: rows.length - cancelled.length,
    globalMarginBp: settings.data?.global_margin_bp ?? 0,
  };
}
