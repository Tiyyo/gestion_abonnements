import { compareDates } from '@abonnements/core';

/** Marqueur des notes « à revoir plus tard » (le marchand va réessayer le prélèvement). */
export const RETRY_NOTE = 'review_again';

export function isPostponed(payloads: readonly string[], chargeId: string, today: string): boolean {
  return payloads.some((p) => {
    const note = JSON.parse(p) as { kind?: string; chargeId?: string; reviewAgainOn?: string };
    return note.kind === RETRY_NOTE && note.chargeId === chargeId && !!note.reviewAgainOn && compareDates(note.reviewAgainOn, today) > 0;
  });
}
