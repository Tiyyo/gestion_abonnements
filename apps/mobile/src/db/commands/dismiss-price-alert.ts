import type { Kysely } from 'kysely';
import { nowIso } from '@/db/now-iso';
import type { DB } from '@/db/types';

/** Masque l'alerte « Hausse de prix » : l'horodatage est rangé dans la charge utile de l'événement `price_change`. */
export async function dismissPriceAlert(db: Kysely<DB>, eventId: string, dismissedAt: string = nowIso()): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const event = await trx
      .selectFrom('event')
      .select('payload')
      .where('id', '=', eventId)
      .where('type', '=', 'price_change')
      .executeTakeFirstOrThrow();
    const payload = JSON.stringify({ ...(JSON.parse(event.payload) as Record<string, unknown>), dismissedAt });
    await trx.updateTable('event').set({ payload }).where('id', '=', eventId).execute();
  });
}
