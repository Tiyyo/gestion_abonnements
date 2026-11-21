import * as Linking from 'expo-linking';
import { type BankLink, buildBankLink } from './bank-link';
import { finishConsent, startConsent } from './consent-client';
import { ConsentError, consentErrorKind } from './consent-error';
import { consentReturnUrl } from './consent-inbox';
import { checkReturn, type ConsentReturn } from './consent-return';
import type { ConsentSession } from './consent-schema';
import { clearPendingConsent, loadPendingConsent, saveBankLink, savePendingConsent } from './link-store';

type Config = { url: string; secret: string };

/** Ouvre la page d'autorisation dans le navigateur du téléphone ; le retour se fait par lien profond. */
export async function openBank(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    throw new ConsentError('browser');
  }
}

/** Lance une demande d'accord : garde le `state` attendu au retour, puis ouvre la banque. Renvoie l'adresse ouverte. */
export async function beginConsent(config: Config): Promise<string> {
  const start = await startConsent(config, consentReturnUrl());
  try {
    await savePendingConsent({ state: start.state, startedAt: Date.now() });
  } catch {
    throw new ConsentError('storage');
  }
  await openBank(start.url);
  return start.url;
}

/** Valide le retour de la banque puis échange son code contre la session. La demande en cours est close dans tous les cas, sauf retour étranger. */
export async function completeConsent(config: Config, ret: ConsentReturn): Promise<ConsentSession> {
  let code: string;
  try {
    code = checkReturn(ret, await loadPendingConsent(), Date.now());
  } catch (error) {
    if (consentErrorKind(error) !== 'state_mismatch') {
      await clearPendingConsent();
    }
    throw error;
  }
  await clearPendingConsent();
  const session = await finishConsent(config, code);
  if (session.accounts.length < 2) {
    throw new ConsentError('no_accounts');
  }
  return session;
}

/** Enregistre la session et les deux comptes choisis dans le coffre de clés. */
export async function storeBankLink(session: ConsentSession, currentUid: string | null, vaultUid: string | null): Promise<BankLink> {
  const link = buildBankLink(session, currentUid, vaultUid);
  if (!link) {
    throw new ConsentError('no_accounts');
  }
  try {
    await saveBankLink(link);
  } catch {
    throw new ConsentError('storage');
  }
  return link;
}
