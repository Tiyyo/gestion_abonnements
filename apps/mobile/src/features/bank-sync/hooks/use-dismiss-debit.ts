import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { dismissBankTransaction } from '@/db/reconcile/bank/dismiss-bank-transaction';

/** « Ignorer » un débit non prévu : il disparaît de l'Accueil, rien d'autre ne change. */
export function useDismissDebit() {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => dismissBankTransaction(db, transactionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  });
}
