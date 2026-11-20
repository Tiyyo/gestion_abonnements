import { categoryIdFor, isBrandIconKey, type BrandMatch } from './brands';
import type { EnrichResponse } from './enrich-schema';

export interface Suggestion {
  source: 'correction' | 'brand' | 'ai';
  categoryId: string;
  iconKey: string | null;
  cancelUrl: string | null;
  trialDays: number | null;
}

export function fromEnrich(response: EnrichResponse): Suggestion {
  return {
    source: 'ai',
    categoryId: categoryIdFor(response.category),
    iconKey: isBrandIconKey(response.iconKey) ? response.iconKey : null,
    cancelUrl: response.cancelUrl,
    trialDays: response.trialDays,
  };
}

export function fromCorrection(correction: { category_id: string; icon_key: string | null }): Suggestion {
  return {
    source: 'correction',
    categoryId: correction.category_id,
    iconKey: isBrandIconKey(correction.icon_key) ? correction.icon_key : null,
    cancelUrl: null,
    trialDays: null,
  };
}

export function fromBrand(brand: BrandMatch): Suggestion {
  return { source: 'brand', categoryId: brand.categoryId, iconKey: brand.iconKey, cancelUrl: null, trialDays: null };
}
