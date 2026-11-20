import type { Kysely } from 'kysely';
import { loadVaultTransfers } from '@/db/repositories/plan/vault-transfers';
import type { DB } from '@/db/types';
import type { WidgetTransfer } from '@/features/widget/snapshot';

/** Transferts coffre → compte encore prévus (ceux de l'Accueil : en retard et à venir), réduits pour le widget. */
export async function loadWidgetTransfers(db: Kysely<DB>): Promise<WidgetTransfer[]> {
  const settings = await db.selectFrom('settings').select('global_margin_bp').executeTakeFirstOrThrow();
  const transfers = await loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned');
  return transfers.map((t) => ({ date: t.effectiveDate, amountCents: t.amountCents, names: t.charges.map((c) => c.name) }));
}
