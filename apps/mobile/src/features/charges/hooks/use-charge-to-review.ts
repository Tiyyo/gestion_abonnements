import { useQuery } from '@tanstack/react-query';
import { useDb } from '@/db/provider';
import { chargeToReview } from '@/db/repositories/charges';

export function useChargeToReview(chargeId: string) {
  const db = useDb();
  return useQuery({
    queryKey: ['charges', chargeId, 'review'],
    queryFn: () => chargeToReview(db, chargeId),
  });
}
