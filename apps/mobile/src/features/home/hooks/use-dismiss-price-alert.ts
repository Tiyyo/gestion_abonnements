import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dismissPriceAlert } from '@/db/commands/dismiss-price-alert';
import { useDb } from '@/db/provider';

/** Masque une alerte « Hausse de prix » de l'Accueil (l'événement et l'historique de prix restent intacts). */
export function useDismissPriceAlert() {
  const db = useDb();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => dismissPriceAlert(db, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  });
}
