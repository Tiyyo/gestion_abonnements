import { formatEuros } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { markTransferDoneFromNotification } from '@/db/commands/mark-transfer-done-from-notification';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { useInvalidateAll } from '@/features/home/hooks/use-invalidate-all';
import { nowParts } from '@/notifications/now-parts';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { haptic } from '@/ui/motion/haptics';

/**
 * Bouton « Marquer fait » d'un rappel de transfert : exécute la commande, rafraîchit les écrans et confirme.
 * Une réponse déjà traitée ne fait rien. Les notifications sont replanifiées par le cache de mutations (`query-client`).
 */
export function useNotificationMarkDone() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: { transferId: string; responseKey: string }) =>
      markTransferDoneFromNotification(db, { ...input, at: nowParts().key }, newId),
    onSuccess: async (outcome) => {
      if (outcome.status === 'duplicate') {
        return;
      }
      await invalidate();
      if (outcome.status === 'done') {
        const names = outcome.transfer.charges.map((c) => c.name).join(', ');
        haptic.success();
        showDialog('Transfert marqué fait', `${formatEuros(outcome.transfer.amountCents)} pour ${names}.`, undefined, { tone: 'ok' });
      } else {
        showDialog('Transfert déjà traité', 'Ce transfert n’est plus à faire. Vérifie le Plan en cas de doute.', undefined, {
          tone: 'info',
        });
      }
    },
    onError: (error) => showError('Action impossible', error.message),
  });
}
