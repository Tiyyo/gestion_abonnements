import { z } from 'zod';
import type { ConsentSession } from './consent-schema';

const id = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);

/**
 * Lien bancaire gardé dans le coffre de clés du téléphone (jamais en base ni dans l'export) : la session Enable Banking,
 * les deux comptes à lire et leurs empreintes, qui permettent de les retrouver au renouvellement suivant.
 */
export const bankLinkSchema = z.object({
  sessionId: id,
  currentUid: id,
  vaultUid: id,
  currentHash: z.string(),
  vaultHash: z.string(),
  validUntil: z.string().datetime({ offset: true }),
});

/** Demande d'accord en cours : le `state` reçu de `…/consent/start`, attendu au retour de la banque. */
export const pendingConsentSchema = z.object({ state: z.string().min(1), startedAt: z.number().int() });

export type BankLink = z.infer<typeof bankLinkSchema>;
export type PendingConsent = z.infer<typeof pendingConsentSchema>;

/** Relit une valeur du coffre de clés ; une valeur absente, illisible ou d'un autre format vaut `null`. */
export function parseStored<T>(schema: z.ZodType<T>, raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Assemble le lien à garder ; `null` si l'un des deux comptes ne fait pas partie de la session ou s'ils sont identiques. */
export function buildBankLink(session: ConsentSession, currentUid: string | null, vaultUid: string | null): BankLink | null {
  const current = session.accounts.find((account) => account.uid === currentUid);
  const vault = session.accounts.find((account) => account.uid === vaultUid);
  if (!current || !vault || current.uid === vault.uid) {
    return null;
  }
  return {
    sessionId: session.sessionId,
    currentUid: current.uid,
    vaultUid: vault.uid,
    currentHash: current.identificationHash,
    vaultHash: vault.identificationHash,
    validUntil: session.validUntil,
  };
}
