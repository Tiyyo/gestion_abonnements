import type { BankLink } from './bank-link';
import type { ConsentAccount } from './consent-schema';

export type AccountMapping = { currentUid: string | null; vaultUid: string | null; certain: boolean };

const VAULT_WORDS = /coffre|vault|pocket|épargne|epargne|saving/i;

function only<T>(items: T[]): T | null {
  return items.length === 1 ? items[0]! : null;
}

function byHash(accounts: ConsentAccount[], hash: string | undefined): ConsentAccount | null {
  return hash ? only(accounts.filter((account) => account.identificationHash === hash)) : null;
}

/**
 * Propose le compte courant et le coffre parmi les comptes de la nouvelle session.
 * `certain` : les deux comptes déjà choisis sont retrouvés par leur empreinte, ou bien la session ne contient
 * qu'un compte courant (CACC) et un compte d'épargne (SVGS). Sinon la proposition reste à confirmer à l'écran.
 */
export function suggestMapping(accounts: ConsentAccount[], previous: Pick<BankLink, 'currentHash' | 'vaultHash'> | null): AccountMapping {
  const knownCurrent = byHash(accounts, previous?.currentHash);
  const knownVault = byHash(accounts, previous?.vaultHash);
  if (knownCurrent && knownVault && knownCurrent.uid !== knownVault.uid) {
    return { currentUid: knownCurrent.uid, vaultUid: knownVault.uid, certain: true };
  }

  const current = knownCurrent ?? only(accounts.filter((account) => account.cashAccountType === 'CACC' && account.uid !== knownVault?.uid));
  const others = accounts.filter((account) => account.uid !== current?.uid);
  const vault =
    knownVault ??
    only(others.filter((account) => account.cashAccountType === 'SVGS')) ??
    only(others.filter((account) => VAULT_WORDS.test(`${account.name} ${account.product}`)));
  const typed = accounts.length === 2 && current?.cashAccountType === 'CACC' && vault?.cashAccountType === 'SVGS';
  return { currentUid: current?.uid ?? null, vaultUid: vault?.uid ?? null, certain: typed && !knownCurrent && !knownVault };
}

/** Nom d'un compte dans les listes : son nom, à défaut son produit, à défaut la fin de son IBAN. */
export function accountLabel(account: ConsentAccount): string {
  return account.name || account.product || (account.ibanTail ? `Compte ···${account.ibanTail}` : 'Compte sans nom');
}

/** Précisions sous le nom : devise, produit et fin d'IBAN quand ils sont connus. */
export function accountHint(account: ConsentAccount): string {
  const product = account.name && account.product !== account.name ? account.product : '';
  const iban = account.ibanTail && (account.name || account.product) ? `···${account.ibanTail}` : '';
  return [account.currency, product, iban].filter(Boolean).join(' · ');
}

export function accountName(accounts: ConsentAccount[], uid: string | null): string {
  const account = accounts.find((candidate) => candidate.uid === uid);
  return account ? accountLabel(account) : 'Choisir';
}
