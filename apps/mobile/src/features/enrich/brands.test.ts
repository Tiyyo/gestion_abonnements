import { BRAND_ICONS } from '@/features/subscriptions/brand-icons';
import { BRAND_ALIASES, EXTRA_BRANDS } from './brand-catalog';
import { brandTokens } from './brand-text';
import { AUTO_APPLY_CONFIDENCE, INITIAL_ICON_KEY, isBrandIconKey, matchBrand, resolveIconKey } from './brands';
import { CATEGORY_NAMES } from './enrich-schema';

describe('brandTokens', () => {
  it.each([
    ['Abonnement Netflix.com Premium', ['netflix']],
    ['Disney+', ['disney', 'plus']],
    ['L’Équipe', ['l', 'equipe']],
    ['  SPOTIFY   Famille ', ['spotify']],
    ['Premium', ['premium']],
  ])('« %s »', (name, tokens) => {
    expect(brandTokens(name)).toEqual(tokens);
  });
});

describe('matchBrand', () => {
  it.each([
    ['Spotify', 'spotify', 'cat-musique'],
    ['spotify premium', 'spotify', 'cat-musique'],
    ['Apple TV+', 'appletv', 'cat-video'],
    ['apple tv', 'appletv', 'cat-video'],
    ['YouTube Music', 'youtubemusic', 'cat-musique'],
    ['YouTube Premium', 'youtube', 'cat-video'],
    ['iCloud+', 'icloud', 'cat-cloud'],
    ['L’Équipe', 'lequipe', 'cat-presse'],
    ['Netflix', 'netflix', 'cat-video'],
    ['NETFLIX.COM', 'netflix', 'cat-video'],
    ['Abonnement Netflix', 'netflix', 'cat-video'],
    ['Netflix Standard avec pub', 'netflix', 'cat-video'],
    ['PayPal *Netflix', 'netflix', 'cat-video'],
    ['Nord VPN', 'nordvpn', 'cat-productivite'],
    ['Claude Max', 'claude', 'cat-ia'],
    ['HBO Max', 'hbomax', 'cat-video'],
    ['GeForce Now', 'nvidia', 'cat-jeux'],
    ['Google One', 'google', 'cat-cloud'],
    ['Google Drive', 'googledrive', 'cat-cloud'],
    ['Uber Eats', 'ubereats', 'cat-autre'],
    ['Amazon Prime', 'amazonprime', 'cat-video'],
    ['Prime Video', 'amazonprime', 'cat-video'],
    ['Amazon Music Unlimited', null, 'cat-musique'],
    ['Disney Plus', 'disneyplus', 'cat-video'],
    ['Disney+', 'disneyplus', 'cat-video'],
    ['Ligue 1+', 'ligue1plus', 'cat-video'],
    ['Hinge', 'hinge', 'cat-autre'],
    ['Canal+', null, 'cat-video'],
    ['canal plus', null, 'cat-video'],
    ['ChatGPT Plus', null, 'cat-ia'],
    ['Microsoft 365 Famille', null, 'cat-productivite'],
  ])('« %s » est reconnu avec certitude (%s, %s)', (name, iconKey, categoryId) => {
    const match = matchBrand(name);
    expect(match).toMatchObject({ iconKey, categoryId });
    expect(match?.confidence).toBeGreaterThanOrEqual(AUTO_APPLY_CONFIDENCE);
  });

  it.each([
    ['Amazone Prime', 'amazonprime', 'Amazon Prime'],
    ['Netflx', 'netflix', 'Netflix'],
    ['Netfilx', 'netflix', 'Netflix'],
    ['Sptoify', 'spotify', 'Spotify'],
    ['Youtub Premium', 'youtube', 'YouTube'],
    ['Disny Plus', 'disneyplus', 'Disney+'],
    ['Crunchyrol', 'crunchyroll', 'Crunchyroll'],
    ['Dezzer Premium', 'deezer', 'Deezer'],
  ])('« %s » (faute de frappe) donne %s', (name, iconKey, title) => {
    expect(matchBrand(name)).toMatchObject({ iconKey, title });
  });

  it('applique d’office une faute sur un nom long, demande confirmation sur un nom court', () => {
    expect(matchBrand('Amazone Prime')?.confidence).toBeGreaterThanOrEqual(AUTO_APPLY_CONFIDENCE);
    expect(matchBrand('Netflx')?.confidence).toBeGreaterThanOrEqual(AUTO_APPLY_CONFIDENCE);
    expect(matchBrand('Dezzer')?.confidence).toBeLessThan(AUTO_APPLY_CONFIDENCE);
    expect(matchBrand('Stream')?.confidence ?? 0).toBeLessThan(AUTO_APPLY_CONFIDENCE);
  });

  it.each([
    'Nom de domaine',
    'Loyer',
    'Assurance habitation',
    'Salle de sport',
    'Électricité',
    'Mutuelle',
    'Canal de Provence',
    'Meta',
    'Tree',
    'Maxi Zoo',
    'Shopify',
    'Motion',
    'Sigma',
    'x',
    '',
    '+',
  ])('« %s » ne donne rien', (name) => {
    expect(matchBrand(name)).toBeNull();
  });

  it('ne tranche pas entre deux marques aussi proches l’une que l’autre', () => {
    expect(matchBrand('Mon Spotify Netflix')).toBeNull();
    expect(matchBrand('Protonn')).toMatchObject({ iconKey: 'proton' });
    expect(matchBrand('Proton Drivn')).toMatchObject({ iconKey: 'proton' });
  });

  it('est déterministe', () => {
    expect(matchBrand('Amazone Prime')).toEqual(matchBrand('amazone  prime'));
  });
});

describe('catalogue des marques', () => {
  it('ne référence que des logos embarqués et des catégories connues', () => {
    for (const slug of Object.keys(BRAND_ALIASES)) {
      expect(isBrandIconKey(slug), slug).toBe(true);
    }
    for (const extra of EXTRA_BRANDS) {
      expect(extra.iconKey === null || isBrandIconKey(extra.iconKey), extra.title).toBe(true);
      expect(CATEGORY_NAMES, extra.title).toContain(extra.category);
    }
    for (const icon of Object.values(BRAND_ICONS)) {
      expect(CATEGORY_NAMES, icon.title).toContain(icon.category);
    }
  });

  it('retrouve chaque logo par son titre', () => {
    for (const [slug, icon] of Object.entries(BRAND_ICONS)) {
      expect(matchBrand(icon.title), icon.title).toMatchObject({ iconKey: slug, confidence: 1 });
    }
  });
});

describe('resolveIconKey', () => {
  it('garde le logo enregistré', () => {
    expect(resolveIconKey('Netflix', 'spotify')).toBe('spotify');
  });

  it('déduit le logo du nom quand aucun n’est enregistré', () => {
    expect(resolveIconKey('Netflix', 'tag')).toBe('netflix');
    expect(resolveIconKey('Netflix', null)).toBe('netflix');
    expect(resolveIconKey('Amazone Prime', 'tag')).toBe('amazonprime');
    expect(resolveIconKey('Loyer', 'tag')).toBeNull();
  });

  it('ne déduit rien d’une ressemblance incertaine ni contre le choix de l’initiale', () => {
    expect(resolveIconKey('Dezzer', 'tag')).toBeNull();
    expect(resolveIconKey('Netflix', INITIAL_ICON_KEY)).toBeNull();
  });

  it('reconnaît les clés de logo embarquées', () => {
    expect(isBrandIconKey('netflix')).toBe(true);
    expect(isBrandIconKey('tag')).toBe(false);
  });
});
