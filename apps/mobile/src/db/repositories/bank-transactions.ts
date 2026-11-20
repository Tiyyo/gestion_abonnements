import { type BankCoverage, looksFailed } from '@abonnements/core';
import type { Executor } from '@/db/executor';
import type { Settings } from '@/db/types';

/** Ce que la banque dit d'un prélèvement à vérifier : un débit vu, ou aucun débit sur toute sa fenêtre. */
export type BankHint =
  { kind: 'debit'; transactionId: string; amountCents: number; date: string; label: string } | { kind: 'no_debit'; through: string };

/** Débit du compte que l'app n'a rattaché à aucun prélèvement. */
export interface UnexpectedDebitRow {
  transactionId: string;
  label: string;
  amountCents: number;
  date: string;
  subscriptionId: string | null;
  subscriptionName: string | null;
}

export interface BankContext {
  coverage: BankCoverage | null;
  /** Débits proposés, par prélèvement encore ouvert. */
  suggestions: ReadonlyMap<string, Extract<BankHint, { kind: 'debit' }>>;
  unexpected: readonly UnexpectedDebitRow[];
}

export function coverageOf(settings: Pick<Settings, 'bank_sync_from' | 'bank_sync_through'>): BankCoverage | null {
  return settings.bank_sync_from && settings.bank_sync_through
    ? { from: settings.bank_sync_from, through: settings.bank_sync_through }
    : null;
}

/**
 * État du rapprochement bancaire. Un débit proposé pour un prélèvement abandonné ou disparu depuis
 * redevient un débit non prévu ; s'il a été marqué passé, il est soldé.
 */
export async function loadBankContext(db: Executor): Promise<BankContext> {
  const settings = await db.selectFrom('settings').select(['bank_sync_from', 'bank_sync_through']).executeTakeFirstOrThrow();
  const rows = await db
    .selectFrom('bank_transaction as b')
    .leftJoin('charge as c', 'c.id', 'b.charge_id')
    .leftJoin('subscription as s', (join) => join.on((eb) => eb('s.id', '=', eb.fn.coalesce('b.subscription_id', 'c.subscription_id'))))
    .select(['b.id', 'b.label', 'b.amount_cents', 'b.booking_date', 'b.outcome', 'b.charge_id'])
    .select(['c.status as charge_status', 's.id as subscription_id', 's.name as subscription_name'])
    .where('b.outcome', 'in', ['suggested', 'unmatched'])
    .orderBy('b.booking_date')
    .orderBy('b.id')
    .execute();

  const suggestions = new Map<string, Extract<BankHint, { kind: 'debit' }>>();
  const unexpected: UnexpectedDebitRow[] = [];
  for (const r of rows) {
    const open = r.charge_status === 'planned' || r.charge_status === 'funded' || r.charge_status === 'unfunded';
    if (r.outcome === 'suggested' && open && r.charge_id) {
      suggestions.set(r.charge_id, {
        kind: 'debit',
        transactionId: r.id,
        amountCents: r.amount_cents,
        date: r.booking_date,
        label: r.label,
      });
    } else if (r.outcome === 'unmatched' || r.charge_status !== 'paid') {
      unexpected.push({
        transactionId: r.id,
        label: r.label,
        amountCents: r.amount_cents,
        date: r.booking_date,
        subscriptionId: r.subscription_id,
        subscriptionName: r.subscription_name,
      });
    }
  }
  return { coverage: coverageOf(settings), suggestions, unexpected };
}

export function bankHintFor(context: BankContext, charge: { id: string; due_date: string }): BankHint | null {
  const suggestion = context.suggestions.get(charge.id);
  if (suggestion) {
    return suggestion;
  }
  const failed = looksFailed(
    charge.due_date,
    context.coverage,
    context.unexpected.map((u) => u.date),
  );
  return failed && context.coverage ? { kind: 'no_debit', through: context.coverage.through } : null;
}
