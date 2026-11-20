import type { CATEGORY_NAMES } from './enrich-schema';

type CategoryName = (typeof CATEGORY_NAMES)[number];

/**
 * Autres appellations des marques qui ont un logo embarqué (clé = `iconKey` de `brand-icons.ts`).
 * Le titre et la clé du logo sont déjà reconnus : n'ajouter ici que les variantes.
 */
export const BRAND_ALIASES: Readonly<Record<string, readonly string[]>> = {
  applemusic: ['itunes music'],
  youtubemusic: ['yt music'],
  appletv: ['apple tv plus', 'appletv plus'],
  youtube: ['youtube tv'],
  paramountplus: ['paramount'],
  hbomax: ['hbo'],
  icloud: ['apple icloud', 'icloud drive'],
  googledrive: ['gdrive'],
  playstation: ['playstation plus', 'playstation network', 'ps plus', 'psn'],
  epicgames: ['epic'],
  ea: ['ea play', 'electronic arts'],
  nvidia: ['geforce now', 'nvidia geforce now'],
  nordvpn: ['nord vpn', 'nord'],
  expressvpn: ['express vpn'],
  protonmail: ['proton mail'],
  protonvpn: ['proton vpn'],
  githubcopilot: ['copilot'],
  jetbrains: ['intellij', 'webstorm', 'pycharm'],
  lequipe: ['l equipe', 'equipe'],
  newyorktimes: ['the new york times', 'nytimes', 'nyt'],
  theguardian: ['guardian'],
  claude: ['claude ai'],
  mistralai: ['mistral', 'le chat mistral'],
  googlegemini: ['gemini', 'gemini advanced'],
  elevenlabs: ['eleven labs'],
  ubereats: ['uber eats', 'uber one'],
  sncf: ['sncf connect', 'tgv max', 'max jeune', 'carte avantage'],
  hellofresh: ['hello fresh'],
  discord: ['discord nitro'],
  amazonprime: ['amazon prime video', 'prime video', 'amazon video', 'amazon', 'prime', 'amzn prime'],
  disneyplus: ['disney plus', 'disney'],
  ligue1plus: ['ligue 1 plus', 'ligue1 plus', 'ligue 1', 'ligue1'],
  hinge: ['hinge dating'],
};

export interface ExtraBrand {
  title: string;
  /** Logo embarqué à réutiliser, ou `null` : la marque n'est pas dans Simple Icons, l'initiale reste affichée. */
  iconKey: string | null;
  category: CategoryName;
  names: readonly string[];
}

/** Marques sans logo dans Simple Icons, ou offres dont la catégorie diffère de celle du logo. */
export const EXTRA_BRANDS: readonly ExtraBrand[] = [
  { title: 'Amazon Music', iconKey: null, category: 'Musique', names: ['amazon music', 'amzn music'] },
  { title: 'Canal+', iconKey: null, category: 'Vidéo', names: ['canal plus', 'mycanal'] },
  { title: 'OCS', iconKey: null, category: 'Vidéo', names: ['ocs'] },
  { title: 'Molotov', iconKey: null, category: 'Vidéo', names: ['molotov', 'molotov tv'] },
  { title: 'ADN', iconKey: null, category: 'Vidéo', names: ['adn', 'animation digital network'] },
  { title: 'beIN Sports', iconKey: null, category: 'Vidéo', names: ['bein sports', 'bein sport', 'bein connect', 'bein'] },
  { title: 'RMC Sport', iconKey: null, category: 'Vidéo', names: ['rmc sport'] },
  { title: 'TF1+', iconKey: null, category: 'Vidéo', names: ['tf1 plus', 'tf1'] },
  { title: 'Qobuz', iconKey: null, category: 'Musique', names: ['qobuz'] },
  { title: 'Google One', iconKey: 'google', category: 'Stockage cloud', names: ['google one'] },
  { title: 'OneDrive', iconKey: null, category: 'Stockage cloud', names: ['onedrive', 'microsoft onedrive'] },
  { title: 'kDrive', iconKey: 'infomaniak', category: 'Stockage cloud', names: ['kdrive'] },
  {
    title: 'Microsoft 365',
    iconKey: null,
    category: 'Productivité',
    names: ['microsoft 365', 'office 365', 'microsoft office', 'microsoft', 'm365'],
  },
  {
    title: 'Adobe',
    iconKey: null,
    category: 'Productivité',
    names: ['adobe', 'adobe creative cloud', 'creative cloud', 'photoshop', 'lightroom', 'acrobat'],
  },
  { title: 'Canva', iconKey: null, category: 'Productivité', names: ['canva'] },
  { title: 'Slack', iconKey: null, category: 'Productivité', names: ['slack'] },
  { title: 'LinkedIn', iconKey: null, category: 'Productivité', names: ['linkedin'] },
  { title: 'ChatGPT', iconKey: null, category: 'IA', names: ['chatgpt', 'chat gpt', 'openai'] },
  { title: 'Midjourney', iconKey: null, category: 'IA', names: ['midjourney'] },
  { title: 'Xbox Game Pass', iconKey: null, category: 'Jeux', names: ['xbox game pass', 'game pass', 'xbox', 'xbox live'] },
  { title: 'Nintendo Switch Online', iconKey: null, category: 'Jeux', names: ['nintendo switch online', 'switch online', 'nintendo'] },
  { title: 'Le Monde', iconKey: null, category: 'Presse', names: ['le monde', 'lemonde'] },
  { title: 'Mediapart', iconKey: null, category: 'Presse', names: ['mediapart'] },
  { title: 'Le Figaro', iconKey: null, category: 'Presse', names: ['le figaro', 'lefigaro'] },
  { title: 'Basic-Fit', iconKey: null, category: 'Santé/Sport', names: ['basic fit'] },
  { title: 'Fitness Park', iconKey: null, category: 'Santé/Sport', names: ['fitness park'] },
];
