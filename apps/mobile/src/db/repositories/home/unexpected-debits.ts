import type { Kysely } from 'kysely';
import { classifyDebit } from '@/db/reconcile/classify-debit';
import type { UnexpectedDebitRow } from '@/db/repositories/bank-transactions';
import type { DB } from '@/db/types';
import type { HomeUnexpectedDebit } from './types';

/** Classe chaque débit non rattaché avec les règles du prélèvement inconnu, sous le nom de l'abonnement reconnu s'il y en a un. */
export async function unexpectedDebits(db: Kysely<DB>, rows: readonly UnexpectedDebitRow[]): Promise<HomeUnexpectedDebit[]> {
  const result: HomeUnexpectedDebit[] = [];
  for (const row of rows) {
    const name = row.subscriptionName ?? row.label;
    const outcome = await classifyDebit(db, { name, amountCents: row.amountCents, date: row.date });
    result.push({ ...row, name, kind: outcome.kind === 'matches_charge' ? 'matches_charge' : outcome.type });
  }
  return result;
}
