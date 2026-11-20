import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { loadVaultTransfers } from '@/db/repositories/plan/vault-transfers';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { scheduledNotificationsRepository } from '@/db/repositories/scheduled-notifications';
import { settingsRepository } from '@/db/repositories/settings';
import type { DB } from '@/db/types';
import { markTransferDone } from './mark-transfer-done';

export type NotificationMarkOutcome =
  /** Le transfert vient d'être marqué fait. */
  | { status: 'done'; transfer: PlanTransfer }
  /** Cette réponse a déjà été traitée (relance de l'app avec la même notification) : rien à faire ni à dire. */
  | { status: 'duplicate' }
  /** Le transfert n'est plus à faire (déjà fait, ou disparu du plan depuis l'envoi du rappel). */
  | { status: 'unavailable' };

export interface NotificationMarkInput {
  transferId: string;
  /** Clé de la réponse (`responseKey`), mémorisée pour ne l'appliquer qu'une fois, même après un redémarrage. */
  responseKey: string;
  /** Instant local `YYYY-MM-DDTHH:mm`. */
  at: string;
}

/**
 * Bouton « Marquer fait » d'un rappel de transfert. La réponse est mémorisée dans `scheduled_notification`
 * (`ref_id = action:<clé>`) : Android peut la redonner à l'app à un lancement ultérieur, et elle ne doit pas
 * refaire un transfert remis « à faire » entre-temps.
 */
export async function markTransferDoneFromNotification(
  db: Kysely<DB>,
  input: NotificationMarkInput,
  newId: NewId,
): Promise<NotificationMarkOutcome> {
  const handled = scheduledNotificationsRepository(db, newId);
  const refId = `action:${input.responseKey}`;
  if (await handled.exists('funding', refId)) {
    return { status: 'duplicate' };
  }
  const settings = await settingsRepository(db).get();
  const planned = await loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned');
  const transfer = planned.find((t) => t.id === input.transferId);
  if (transfer) {
    await markTransferDone(db, transfer.id);
  }
  await handled.recordIfNew({ kind: 'funding', refId, fireAt: input.at, osNotificationId: null });
  return transfer ? { status: 'done', transfer } : { status: 'unavailable' };
}
