import { normalizeName } from '@abonnements/core';

/** Mots qui accompagnent une marque sans la désigner : ignorés avant de comparer. */
const NOISE = new Set([
  'abonnement',
  'abonnements',
  'abo',
  'subscription',
  'premium',
  'pro',
  'mensuel',
  'mensuelle',
  'annuel',
  'annuelle',
  'famille',
  'family',
  'duo',
  'etudiant',
  'student',
  'individuel',
  'standard',
  'essentiel',
  'forfait',
  'offre',
  'pack',
  'essai',
  'gratuit',
  'trial',
  'www',
  'sas',
  'sarl',
  'inc',
  'ltd',
]);

const DOMAIN_SUFFIX = /\.(com|fr|net|org|tv|io|app|eu|ai|co|me)\b/g;

/**
 * Mots significatifs d'un nom : minuscules, sans accent ni ponctuation, « + » lu « plus », suffixe de domaine
 * et mots d'accompagnement retirés (« Abonnement Netflix.com Premium » → `netflix`). Un nom fait uniquement
 * de mots d'accompagnement est gardé tel quel.
 */
export function brandTokens(name: string): string[] {
  const tokens = normalizeName(name)
    .replace(DOMAIN_SUFFIX, ' ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const kept = tokens.filter((token) => !NOISE.has(token));
  return kept.length > 0 ? kept : tokens;
}

export interface TokenWindow {
  /** Mots collés (« you tube music » → `youtubemusic`). */
  key: string;
  /** La fenêtre commence au premier mot. */
  leading: boolean;
  /** La fenêtre couvre tout le nom. */
  full: boolean;
}

const MAX_TOKENS = 6;

/** Toutes les suites de mots consécutifs du nom, de la plus longue à la plus courte. */
export function tokenWindows(tokens: readonly string[]): TokenWindow[] {
  const limited = tokens.slice(0, MAX_TOKENS);
  const windows: TokenWindow[] = [];
  for (let length = limited.length; length >= 1; length--) {
    for (let start = 0; start + length <= limited.length; start++) {
      windows.push({
        key: limited.slice(start, start + length).join(''),
        leading: start === 0,
        full: length === tokens.length,
      });
    }
  }
  return windows;
}
