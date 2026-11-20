import { nextSyncFrom } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { applyBankTransactions, type BankSyncResult } from '@/db/reconcile/bank/apply-bank-transactions';
import { coverageOf } from '@/db/repositories/bank-transactions';
import { settingsRepository } from '@/db/repositories/settings';
import type { DB } from '@/db/types';
import type { BalancesTarget } from '@/features/balances/fetch-balances';
import { BRAND_ICONS } from '@/features/subscriptions/brand-icons';
import { fetchTransactions } from './fetch-transactions';

/** Le nom de la marque du logo sert d'autre nom pour reconnaître le marchand sur le relevé. */
export function brandAliases(iconKey: string): readonly string[] {
  const brand = (BRAND_ICONS as Record<string, { title: string } | undefined>)[iconKey];
  return brand ? [brand.title] : [];
}

interface SyncOptions {
  config: { url: string; secret: string };
  today: string;
  newId: NewId;
  /** Session et comptes renouvelés depuis l'app (`null` : ceux de la fonction). */
  target?: BalancesTarget | null;
  fetchImpl?: typeof fetch;
}

/**
 * Une lecture du compte : relit depuis la dernière période couverte puis applique les rapprochements sûrs.
 * Rend `null` sans rien appeler si le rapprochement automatique est coupé.
 */
export async function runBankSync(
  db: Kysely<DB>,
  { config, today, newId, target = null, fetchImpl }: SyncOptions,
): Promise<BankSyncResult | null> {
  const settings = await settingsRepository(db).get();
  if (settings.auto_reconcile_enabled !== 1) {
    return null;
  }
  const batch = await fetchTransactions(config, nextSyncFrom(coverageOf(settings), today), target, fetchImpl);
  return applyBankTransactions(db, batch, today, newId, brandAliases);
}
