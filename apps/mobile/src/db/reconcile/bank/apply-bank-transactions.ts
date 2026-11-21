import { type BankDebit, compareDates, type DebitDecision, matchBankDebits, mergeCoverage } from '@abonnements/core';
import type { Kysely, Transaction } from 'kysely';
import type { NewId } from '@/db/executor';
import { nowIso } from '@/db/now-iso';
import { reviewChargeIn } from '@/db/reconcile/review-charge';
import { coverageOf } from '@/db/repositories/bank-transactions';
import type { BankOutcome, DB } from '@/db/types';
import { type AliasesFor, loadMatchingInput } from './matching-input';

/** Réponse de la fonction `/transactions`, déjà validée par l'app. */
export interface BankBatch {
  from: string;
  complete: boolean;
  transactions: readonly {
    id: string;
    bookingDate: string;
    amountCents: number;
    currency: string;
    direction: 'debit' | 'credit';
    status: 'booked' | 'pending';
    label: string;
    remittance: string | null;
  }[];
}

export interface BankSyncResult {
  applied: number;
  suggested: number;
  unmatched: number;
}

const OUTCOMES: Record<DebitDecision['kind'], BankOutcome> = {
  apply: 'applied',
  suggest: 'suggested',
  already_paid: 'applied',
  already_recorded: 'recorded',
  internal: 'internal',
  unmatched: 'unmatched',
};

/** Seuls les débits comptabilisés en euros comptent : un débit en attente peut encore être annulé. */
function bookedDebits(batch: BankBatch, today: string): BankDebit[] {
  return batch.transactions
    .filter(
      (t) =>
        t.status === 'booked' &&
        t.direction === 'debit' &&
        t.currency === 'EUR' &&
        t.amountCents > 0 &&
        compareDates(t.bookingDate, today) <= 0,
    )
    .map((t) => ({ id: t.id, date: t.bookingDate, amountCents: t.amountCents, label: t.label, remittance: t.remittance }));
}

async function unseen(trx: Transaction<DB>, debits: readonly BankDebit[]): Promise<BankDebit[]> {
  if (debits.length === 0) {
    return [];
  }
  const ids = debits.map((d) => d.id);
  const known = new Set((await trx.selectFrom('bank_transaction').select('id').where('id', 'in', ids).execute()).map((r) => r.id));
  return debits.filter((d, index) => !known.has(d.id) && ids.indexOf(d.id) === index);
}

async function record(trx: Transaction<DB>, decision: DebitDecision): Promise<void> {
  const { debit } = decision;
  await trx
    .insertInto('bank_transaction')
    .values({
      id: debit.id,
      booking_date: debit.date,
      amount_cents: debit.amountCents,
      label: debit.label || debit.remittance || '',
      outcome: OUTCOMES[decision.kind],
      charge_id: 'chargeId' in decision ? decision.chargeId : null,
      subscription_id: decision.kind === 'unmatched' ? decision.subscriptionId : null,
      ref_id: decision.kind === 'already_recorded' ? decision.recordId : decision.kind === 'internal' ? decision.transferId : null,
    })
    .execute();
}

/**
 * Rapprochement automatique : enregistre chaque nouveau débit du compte (une seule fois, la clé primaire en répond)
 * et marque « passé » les seuls prélèvements rattachés sans équivoque, par la même commande que la saisie manuelle.
 * Rien n'est financé ni abandonné ici : les cas douteux attendent la réponse de l'utilisateur.
 */
export async function applyBankTransactions(
  db: Kysely<DB>,
  batch: BankBatch,
  today: string,
  newId: NewId,
  aliasesFor: AliasesFor = () => [],
): Promise<BankSyncResult> {
  return db.transaction().execute(async (trx) => {
    const result: BankSyncResult = { applied: 0, suggested: 0, unmatched: 0 };
    const debits = await unseen(trx, bookedDebits(batch, today));
    const decisions = debits.length > 0 ? matchBankDebits(await loadMatchingInput(trx, debits, aliasesFor)) : [];
    for (const decision of decisions) {
      await record(trx, decision);
      if (decision.kind === 'apply') {
        const { debit } = decision;
        await reviewChargeIn(trx, decision.chargeId, { kind: 'paid', amountCents: debit.amountCents, date: debit.date }, today, newId);
        result.applied += 1;
      } else if (decision.kind === 'suggest') {
        result.suggested += 1;
      } else if (decision.kind === 'unmatched') {
        result.unmatched += 1;
      }
    }
    const settings = await trx.selectFrom('settings').select(['bank_sync_from', 'bank_sync_through']).executeTakeFirstOrThrow();
    const coverage = mergeCoverage(coverageOf(settings), batch.from, batch.complete, today);
    await trx
      .updateTable('settings')
      .set({ bank_sync_from: coverage?.from ?? null, bank_sync_through: coverage?.through ?? null, bank_sync_at: nowIso() })
      .where('id', '=', 1)
      .execute();
    return result;
  });
}
