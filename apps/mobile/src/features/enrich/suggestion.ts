import { AUTO_APPLY_CONFIDENCE, categoryIdFor, INITIAL_ICON_KEY, isBrandIconKey, type BrandMatch } from './brands';
import type { EnrichResponse } from './enrich-schema';

export interface Suggestion {
  source: 'correction' | 'brand' | 'ai';
  categoryId: string;
  iconKey: string | null;
  cancelUrl: string | null;
  trialDays: number | null;
  /** De 0 à 1 : une correction vaut 1, une marque reconnue dépend de la ressemblance du nom. */
  confidence: number;
}

type StoredCorrection = { category_id: string; icon_key: string | null };

export function fromEnrich(response: EnrichResponse): Suggestion {
  return {
    source: 'ai',
    categoryId: categoryIdFor(response.category),
    iconKey: isBrandIconKey(response.iconKey) ? response.iconKey : null,
    cancelUrl: response.cancelUrl,
    trialDays: response.trialDays,
    confidence: response.confidence,
  };
}

export function fromCorrection(correction: StoredCorrection): Suggestion {
  const key = correction.icon_key;
  return {
    source: 'correction',
    categoryId: correction.category_id,
    iconKey: key === INITIAL_ICON_KEY || isBrandIconKey(key) ? key : null,
    cancelUrl: null,
    trialDays: null,
    confidence: 1,
  };
}

export function fromBrand(brand: BrandMatch): Suggestion {
  return {
    source: 'brand',
    categoryId: brand.categoryId,
    iconKey: brand.iconKey,
    cancelUrl: null,
    trialDays: null,
    confidence: brand.confidence,
  };
}

/** Ce qui vient de l'appareil (correction apprise, sinon marque reconnue), sans appel réseau. */
export function localSuggestion(correction: StoredCorrection | null | undefined, brand: BrandMatch | null): Suggestion | null {
  return correction ? fromCorrection(correction) : brand ? fromBrand(brand) : null;
}

/** Une correction ou une marque sûre s'applique sans confirmation ; une suggestion de l'IA, jamais. */
export function isAutoApplicable(suggestion: Suggestion | null | undefined): suggestion is Suggestion {
  return !!suggestion && suggestion.source !== 'ai' && suggestion.confidence >= AUTO_APPLY_CONFIDENCE;
}

interface Classification {
  categoryId: string;
  iconKey: string | null;
}

/** La suggestion n'apporterait rien de plus que ce qui est déjà dans le formulaire. */
function addsNothing(suggestion: Suggestion, current: Classification): boolean {
  const sameIcon = suggestion.iconKey === null || suggestion.iconKey === current.iconKey;
  return suggestion.categoryId === current.categoryId && sameIcon && !suggestion.cancelUrl && !suggestion.trialDays;
}

/**
 * Faut-il montrer la carte « Appliquer / Ignorer » ? Non si la suggestion s'applique d'office (formulaire
 * pas encore classé à la main, `locked` à faux) ou si elle n'apporte rien.
 */
export function shouldOfferSuggestion(suggestion: Suggestion, current: Classification, locked: boolean): boolean {
  if (!locked && isAutoApplicable(suggestion)) {
    return false;
  }
  return !addsNothing(suggestion, current);
}
