import type { HomeUnexpectedDebit } from '@/db/repositories/home/types';
import { unexpectedDebitBody, unexpectedDebitTitle } from '@/features/bank-sync/bank-wording';
import { ActionButton } from '@/ui/controls/action-button';
import { HomeCard } from './home-card';

interface Props {
  debit: HomeUnexpectedDebit;
  busy: boolean;
  onReview: () => void;
  onDismiss: () => void;
}

/** Débit lu sur le compte Revolut que Sluis n'a rattaché à aucun prélèvement : à vérifier ou à ignorer. */
export function UnexpectedDebitCard({ debit, busy, onReview, onDismiss }: Props) {
  return (
    <HomeCard
      tone="warn"
      caption="Débit non prévu détecté"
      title={unexpectedDebitTitle(debit)}
      body={unexpectedDebitBody(debit)}
      actions={
        <>
          <ActionButton flex={1} label="Ignorer" variant="outline" disabled={busy} onPress={onDismiss} />
          <ActionButton flex={1} label="Vérifier" variant="warn" disabled={busy} onPress={onReview} />
        </>
      }
    />
  );
}
