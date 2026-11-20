import { compareDates } from '@abonnements/core';
import { type Kysely, sql } from 'kysely';
import { RETRY_NOTE } from '@/db/reconcile/retry-note';
import { loadBankContext } from '@/db/repositories/bank-transactions';
import { loadLedger } from '@/db/repositories/ledger';
import { loadTrials } from '@/db/repositories/plan/trials';
import { loadVaultTransfers } from '@/db/repositories/plan/vault-transfers';
import type { DB } from '@/db/types';
import { priceAlerts } from './price-alerts';
import { homeQuestions } from './questions';
import { chargesToReview } from './reviews';
import { unexpectedDebits } from './unexpected-debits';
import type { HomeData } from './types';
import { upcomingCharges } from './upcoming';

export async function loadHome(db: Kysely<DB>, today: string): Promise<HomeData> {
  const settings = await db.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const [transfers, subs, charges, notes, priceChanges, ledger, bank] = await Promise.all([
    loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned'),
    db.selectFrom('subscription').selectAll().where('archived_at', 'is', null).execute(),
    db
      .selectFrom('charge')
      .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
      .selectAll('charge')
      .select(['subscription.name', 'subscription.status as subscription_status'])
      .where('subscription.archived_at', 'is', null)
      .where('charge.provision_only', '=', 0)
      .where('charge.status', 'in', ['planned', 'funded', 'unfunded'])
      .orderBy('charge.due_date')
      .execute(),
    db.selectFrom('event').select('payload').where('type', '=', 'note').where('payload', 'like', `%${RETRY_NOTE}%`).execute(),
    db
      .selectFrom('event')
      .select(['id', 'subscription_id', 'occurred_on', 'payload'])
      .where('type', '=', 'price_change')
      .orderBy('occurred_on')
      .orderBy('created_at')
      .orderBy(sql`rowid`)
      .execute(),
    loadLedger(db),
    loadBankContext(db),
  ]);

  const questions = homeQuestions(subs, charges, today);
  return {
    overdue: transfers.filter((t) => compareDates(t.effectiveDate, today) < 0),
    next: transfers.find((t) => compareDates(t.effectiveDate, today) >= 0) ?? null,
    questions,
    trials: await loadTrials(db, today, ledger),
    toReview: chargesToReview(
      charges,
      questions,
      notes.map((n) => n.payload),
      today,
      bank,
    ),
    unexpectedDebits: await unexpectedDebits(db, bank.unexpected),
    priceAlerts: priceAlerts(subs, priceChanges, today),
    upcoming: upcomingCharges(charges, transfers, today),
    isEmpty: subs.length === 0,
  };
}
