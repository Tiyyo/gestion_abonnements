import { addDays, type BankDebit, MATCH_TOLERANCE_DAYS, type MatchingInput, type MatchOpenCharge } from '@abonnements/core';
import type { Transaction } from 'kysely';
import type { DB } from '@/db/types';

/** Autres noms d'un abonnement d'après son logo (nom de la marque), fournis par l'app. */
export type AliasesFor = (iconKey: string) => readonly string[];

const UNKNOWN_DEBIT_EVENTS = ['unexpected_charge', 'duplicate', 'post_cancel_charge'] as const;

async function loadCharges(trx: Transaction<DB>, since: string) {
  const linked = trx.selectFrom('bank_transaction').select('charge_id').where('charge_id', 'is not', null);
  const rows = await trx
    .selectFrom('charge')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .selectAll('charge')
    .where('subscription.archived_at', 'is', null)
    .where('charge.provision_only', '=', 0)
    .where('charge.id', 'not in', linked)
    .where((eb) =>
      eb.or([
        eb('charge.status', 'in', ['planned', 'funded', 'unfunded']),
        eb.and([eb('charge.status', '=', 'paid'), eb('charge.actual_date', '>=', since)]),
      ]),
    )
    .execute();
  const openCharges: MatchOpenCharge[] = [];
  const paidCharges: MatchingInput['paidCharges'][number][] = [];
  for (const c of rows) {
    if (c.status === 'planned' || c.status === 'funded' || c.status === 'unfunded') {
      openCharges.push({
        id: c.id,
        subscriptionId: c.subscription_id,
        dueDate: c.due_date,
        status: c.status,
        expectedAmountCents: c.expected_amount_cents,
        isTrialConversion: c.is_trial_conversion === 1,
      });
    } else if (c.actual_amount_cents !== null && c.actual_date !== null) {
      paidCharges.push({
        id: c.id,
        subscriptionId: c.subscription_id,
        actualAmountCents: c.actual_amount_cents,
        actualDate: c.actual_date,
      });
    }
  }
  return { openCharges, paidCharges };
}

/**
 * Tout ce que l'app sait déjà et qui peut expliquer un débit : prélèvements ouverts ou passés à la main,
 * débits inconnus saisis, retours de résidu. Ce qui est déjà rattaché à un mouvement de la banque est écarté.
 */
export async function loadMatchingInput(
  trx: Transaction<DB>,
  debits: readonly BankDebit[],
  aliasesFor: AliasesFor,
): Promise<MatchingInput> {
  const earliest = debits.reduce((min, d) => (d.date < min ? d.date : min), debits[0]?.date ?? '9999-12-31');
  const since = addDays(earliest, -MATCH_TOLERANCE_DAYS);
  const referenced = trx.selectFrom('bank_transaction').select('ref_id').where('ref_id', 'is not', null);

  const subscriptions = await trx
    .selectFrom('subscription')
    .select(['id', 'name', 'icon_key', 'status'])
    .where('archived_at', 'is', null)
    .execute();
  const events = await trx
    .selectFrom('event')
    .select(['id', 'amount_cents', 'occurred_on', 'payload'])
    .where('type', 'in', UNKNOWN_DEBIT_EVENTS)
    .where('amount_cents', 'is not', null)
    .where('occurred_on', '>=', since)
    .where('id', 'not in', referenced)
    .execute();
  const returns = await trx
    .selectFrom('transfer')
    .select(['id', 'amount_cents', 'done_at', 'planned_date'])
    .where('type', '=', 'residual_return')
    .where('status', '=', 'done')
    .where('id', 'not in', referenced)
    .execute();

  return {
    debits,
    subscriptions: subscriptions.map((s) => ({ id: s.id, name: s.name, aliases: aliasesFor(s.icon_key), status: s.status })),
    ...(await loadCharges(trx, since)),
    recordedDebits: events
      .filter((e) => !('chargeId' in (JSON.parse(e.payload) as object)))
      .map((e) => ({ id: e.id, amountCents: e.amount_cents ?? 0, date: e.occurred_on })),
    vaultReturns: returns
      .map((t) => ({ id: t.id, amountCents: t.amount_cents, date: t.done_at?.slice(0, 10) ?? t.planned_date }))
      .filter((t) => t.date >= since),
  };
}
