import { BRAND_ICONS } from '@/features/subscriptions/brand-icons';
import { BRAND_ALIASES, EXTRA_BRANDS } from './brand-catalog';
import { brandTokens, tokenWindows, type TokenWindow } from './brand-text';
import { editDistance } from './edit-distance';

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

/** Confiance à partir de laquelle une marque reconnue est appliquée sans confirmation (formulaire et affichage). */
export const AUTO_APPLY_CONFIDENCE = 0.85;
/** Logo choisi à la main « Initiale du nom » : bloque le logo déduit du nom à l'affichage. */
export const INITIAL_ICON_KEY = 'initial';

const CONFIDENCE = { exact: 1, leading: 0.95, inside: 0.9, partialFuzzy: 0.95 } as const;
/** Longueurs minimales (lettres collées) : en dessous, seule l'égalité stricte compte. */
const MIN_LEADING = 4;
const MIN_INSIDE = 5;
const MIN_FUZZY = 5;
const FUZZY_TWO_ERRORS = 8;

export interface BrandMatch {
  /** Logo embarqué, ou `null` pour une marque connue sans logo (Disney+, Prime Video…). */
  iconKey: string | null;
  title: string;
  categoryId: string;
  /** 1 = nom exact ; ≥ `AUTO_APPLY_CONFIDENCE` = sûr ; en dessous = à confirmer par l'utilisateur. */
  confidence: number;
}

interface Candidate {
  id: string;
  key: string;
  match: Omit<BrandMatch, 'confidence'>;
}

function buildCandidates(): Candidate[] {
  const brands = [
    ...Object.entries(BRAND_ICONS).map(([slug, icon]) => ({
      iconKey: slug as string | null,
      title: icon.title,
      category: icon.category,
      names: [icon.title, slug, ...(BRAND_ALIASES[slug] ?? [])],
    })),
    ...EXTRA_BRANDS.map((extra) => ({ ...extra, names: [extra.title, ...extra.names] })),
  ];
  return brands.flatMap((brand) => {
    const match = { iconKey: brand.iconKey, title: brand.title, categoryId: categoryIdFor(brand.category) };
    const keys = new Set(brand.names.map((name) => brandTokens(name).join('')));
    return [...keys].map((key) => ({ id: brand.title, key, match }));
  });
}

const CANDIDATES = buildCandidates();
const BY_KEY = new Map<string, Candidate[]>();
for (const candidate of CANDIDATES) {
  BY_KEY.set(candidate.key, [...(BY_KEY.get(candidate.key) ?? []), candidate]);
}

interface Scored {
  candidate: Candidate;
  confidence: number;
}

/** Garde le meilleur ; deux marques différentes à égalité = ambigu, donc rien. */
function best(scored: Scored[]): BrandMatch | null {
  const sorted = [...scored].sort((a, b) => b.confidence - a.confidence || b.candidate.key.length - a.candidate.key.length);
  const top = sorted[0];
  if (!top) {
    return null;
  }
  const rival = sorted.find((s) => s.candidate.id !== top.candidate.id);
  if (rival && rival.confidence === top.confidence && rival.candidate.key.length === top.candidate.key.length) {
    return null;
  }
  return { ...top.candidate.match, confidence: top.confidence };
}

/** Égalité stricte, puis marque en tête du nom (« Spotify Famille 6 comptes »), puis marque dans le nom (« PayPal *Netflix »). */
function tokenMatches(windows: readonly TokenWindow[]): Scored[] {
  return windows.flatMap((window) => {
    const confidence = window.full
      ? CONFIDENCE.exact
      : window.leading && window.key.length >= MIN_LEADING
        ? CONFIDENCE.leading
        : window.key.length >= MIN_INSIDE
          ? CONFIDENCE.inside
          : 0;
    return confidence > 0 ? (BY_KEY.get(window.key) ?? []).map((candidate) => ({ candidate, confidence })) : [];
  });
}

/**
 * Fautes de frappe : au plus 1 erreur (2 à partir de 8 lettres), même première lettre, jamais sous 5 lettres.
 * La confiance baisse avec la part de lettres fausses, et un peu plus si seul le début du nom correspond.
 */
function fuzzyMatches(windows: readonly TokenWindow[]): Scored[] {
  const scored: Scored[] = [];
  for (const window of windows) {
    if (!window.leading || window.key.length < MIN_FUZZY) {
      continue;
    }
    for (const candidate of CANDIDATES) {
      if (candidate.key.length < MIN_FUZZY || candidate.key[0] !== window.key[0]) {
        continue;
      }
      const max = candidate.key.length >= FUZZY_TWO_ERRORS ? 2 : 1;
      const distance = editDistance(window.key, candidate.key, max);
      if (distance <= max) {
        const ratio = 1 - distance / Math.max(window.key.length, candidate.key.length);
        scored.push({ candidate, confidence: window.full ? ratio : ratio * CONFIDENCE.partialFuzzy });
      }
    }
  }
  return scored;
}

const CACHE = new Map<string, BrandMatch | null>();
const CACHE_LIMIT = 500;

/** Marque connue correspondant au nom saisi, avec sa catégorie par défaut. Pur et déterministe (résultat mémorisé). */
export function matchBrand(name: string): BrandMatch | null {
  const tokens = brandTokens(name);
  const key = tokens.join(' ');
  if (key.replace(/ /g, '').length < 2) {
    return null;
  }
  const cached = CACHE.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const windows = tokenWindows(tokens);
  const byTokens = tokenMatches(windows);
  const found = best(byTokens.length > 0 ? byTokens : fuzzyMatches(windows));
  if (CACHE.size >= CACHE_LIMIT) {
    CACHE.clear();
  }
  CACHE.set(key, found);
  return found;
}

export function isBrandIconKey(key: string | null | undefined): key is string {
  return !!key && key in BRAND_ICONS;
}

/**
 * Logo à afficher : celui enregistré s'il existe, sinon celui d'une marque reconnue avec certitude dans le nom
 * (abonnements créés sans logo), sauf si l'utilisateur a choisi l'initiale.
 */
export function resolveIconKey(name: string, iconKey: string | null | undefined): string | null {
  if (iconKey === INITIAL_ICON_KEY) {
    return null;
  }
  if (isBrandIconKey(iconKey)) {
    return iconKey;
  }
  const match = matchBrand(name);
  return match && match.confidence >= AUTO_APPLY_CONFIDENCE ? match.iconKey : null;
}
