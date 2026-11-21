import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { type SubscriptionActions, useSubscriptionActions } from '@/features/subscriptions/hooks/use-subscription-actions';
import { DetailButton } from './detail-button';

// Libellés courts : deux boutons se partagent la largeur, sur une seule ligne chacun.
function StatusActions({ row, actions }: { row: SubscriptionRow; actions: SubscriptionActions }) {
  const { busy } = actions;
  if (row.status === 'trial' && row.trial_end_date) {
    return (
      <>
        <DetailButton label="Résilier" tone="danger" disabled={busy} onPress={actions.cancelTrial} />
        <DetailButton label="Garder" disabled={busy} onPress={actions.keepTrial} />
      </>
    );
  }
  if (row.status === 'to_cancel' && row.period_end_date) {
    return (
      <>
        <DetailButton label="Annuler l’arrêt" tone="neutral" disabled={busy} onPress={actions.undoStop} />
        {!row.cancel_done && <DetailButton label="J’ai résilié" disabled={busy} onPress={actions.confirmCancelDone} />}
      </>
    );
  }
  if (row.status === 'cancelled') {
    return (
      <>
        <DetailButton label="Supprimer" tone="danger" disabled={busy} onPress={actions.remove} />
        <DetailButton label="Réactiver" disabled={busy} onPress={actions.reactivate} />
      </>
    );
  }
  return <DetailButton label="Arrêter l’abonnement" tone="danger" disabled={busy} onPress={() => actions.stop(row.next_charge_date)} />;
}

/** Barre d'actions du bas, selon le statut : un seul bouton plein, à droite ; le danger reste en contour. */
export function DetailActions({ row, today }: { row: SubscriptionRow; today: string }) {
  const insets = useSafeAreaInsets();
  const actions = useSubscriptionActions(row.id, today);
  return (
    <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
      <StatusActions row={row} actions={actions} />
    </XStack>
  );
}
