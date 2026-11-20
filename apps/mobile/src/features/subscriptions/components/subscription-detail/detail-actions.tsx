import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { type SubscriptionActions, useSubscriptionActions } from '@/features/subscriptions/hooks/use-subscription-actions';
import { DetailButton } from './detail-button';

function StatusActions({ row, actions }: { row: SubscriptionRow; actions: SubscriptionActions }) {
  const { busy } = actions;
  if (row.status === 'trial' && row.trial_end_date) {
    return (
      <>
        <DetailButton label="Garder (passer en actif)" disabled={busy} onPress={actions.keepTrial} />
        <DetailButton label="Résilier" tone="danger" disabled={busy} onPress={actions.cancelTrial} />
      </>
    );
  }
  if (row.status === 'to_cancel' && row.period_end_date) {
    return (
      <>
        {!row.cancel_done && <DetailButton label="J’ai résilié" disabled={busy} onPress={actions.confirmCancelDone} />}
        <DetailButton label="Annuler la décision" tone="neutral" disabled={busy} onPress={actions.undoStop} />
      </>
    );
  }
  if (row.status === 'cancelled') {
    return (
      <>
        <DetailButton label="Réactiver" disabled={busy} onPress={actions.reactivate} />
        <DetailButton label="Supprimer" tone="danger" disabled={busy} onPress={actions.remove} />
      </>
    );
  }
  return <DetailButton label="Arrêter" tone="danger" disabled={busy} onPress={() => actions.stop(row.next_charge_date)} />;
}

/** Barre d'actions du bas, selon le statut. */
export function DetailActions({ row, today }: { row: SubscriptionRow; today: string }) {
  const insets = useSafeAreaInsets();
  const actions = useSubscriptionActions(row.id, today);
  return (
    <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
      <StatusActions row={row} actions={actions} />
    </XStack>
  );
}
