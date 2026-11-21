import { todayIn } from '@abonnements/core';
import type { Kysely } from 'kysely';
import { subscriptionDetailRows } from '@/db/repositories/subscription-detail';
import type { DB } from '@/db/types';
import { buildHistory, provisionedSince } from './detail-history';
import { buildPriceHistory } from './price-history';

/** Tout ce qu'affiche la fiche d'un abonnement : ligne, réglages, prochain prélèvement, historique, évolution du prix, provisions, risque d'essai. */
export async function loadSubscriptionDetail(db: Kysely<DB>, id: string) {
  const today = todayIn();
  const data = await subscriptionDetailRows(db, id, today);
  if (!data) {
    return null;
  }
  const { row, settings, nextCharge, events, reminders, provisions, lastPaidDate, trialRisk } = data;
  const provisionedCents = provisionedSince(provisions, lastPaidDate);
  const history = buildHistory(events, reminders, `${today}T${new Date().toTimeString().slice(0, 5)}`);
  return { row, settings, nextCharge, history, priceHistory: buildPriceHistory(events), provisionedCents, trialRisk, today };
}

export type SubscriptionDetail = NonNullable<Awaited<ReturnType<typeof loadSubscriptionDetail>>>;
