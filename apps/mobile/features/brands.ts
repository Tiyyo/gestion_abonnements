import { normalizeName } from '@abonnements/core';
import { BRAND_ICONS, type BrandIcon } from '../ui/brand-icons';

const CATEGORY_IDS: Record<string, string> = {
  Musique: 'cat-musique',
  Vidéo: 'cat-video',
  'Stockage cloud': 'cat-cloud',
  Jeux: 'cat-jeux',
  Productivité: 'cat-productivite',
  Presse: 'cat-presse',
  'Santé/Sport': 'cat-sport',
  IA: 'cat-ia',
  Autre: 'cat-autre',
};

export function categoryIdFor(name: string): string {
  return CATEGORY_IDS[name] ?? 'cat-autre';
}

const compact = (value: string) => normalizeName(value).replace(/[^a-z0-9]/g, '');

const INDEX = Object.entries(BRAND_ICONS)
  .map(([slug, icon]) => ({ slug, icon, key: compact(icon.title) }))
  .sort((a, b) => b.key.length - a.key.length);

export interface BrandMatch {
  iconKey: string;
  brand: BrandIcon;
  categoryId: string;
}

export function matchBrand(name: string): BrandMatch | null {
  const key = compact(name);
  if (key.length < 2) {
    return null;
  }
  const found = INDEX.find((b) => key === b.key || key === b.slug || (b.key.length >= 4 && key.startsWith(b.key)));
  return found ? { iconKey: found.slug, brand: found.icon, categoryId: categoryIdFor(found.icon.category) } : null;
}

export function isBrandIconKey(key: string | null | undefined): key is string {
  return !!key && key in BRAND_ICONS;
}
