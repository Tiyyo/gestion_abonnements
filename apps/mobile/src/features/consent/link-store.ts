import * as SecureStore from 'expo-secure-store';
import { type BankLink, bankLinkSchema, parseStored, type PendingConsent, pendingConsentSchema } from './bank-link';

// Coffre de clés du téléphone (Android Keystore) : ces valeurs ne vont ni en base ni dans l'export.
const LINK_KEY = 'sluis.bank-link';
const PENDING_KEY = 'sluis.consent-pending';

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/** Session et comptes du dernier accord renouvelé depuis l'app ; `null` tant que la fonction utilise les siens. */
export async function loadBankLink(): Promise<BankLink | null> {
  return parseStored(bankLinkSchema, await read(LINK_KEY));
}

export async function saveBankLink(link: BankLink): Promise<void> {
  await SecureStore.setItemAsync(LINK_KEY, JSON.stringify(link));
}

export async function loadPendingConsent(): Promise<PendingConsent | null> {
  return parseStored(pendingConsentSchema, await read(PENDING_KEY));
}

export async function savePendingConsent(pending: PendingConsent): Promise<void> {
  await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(pending));
}

export async function clearPendingConsent(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_KEY).catch(() => undefined);
}
