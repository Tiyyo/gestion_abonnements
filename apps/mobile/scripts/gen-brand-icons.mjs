import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const icons = require('simple-icons');
const here = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(dirname(require.resolve('simple-icons')), 'package.json'), 'utf8')).version;

// Liste source : chaque marque a un logo Simple Icons et une catégorie par défaut (noms de `CATEGORY_NAMES`).
// Les autres appellations (« Prime Video », « Disney+ »…) et les marques sans logo sont dans
// `src/features/enrich/brand-catalog.ts`.
const BRANDS = {
  Musique: ['spotify', 'deezer', 'applemusic', 'tidal', 'youtubemusic', 'soundcloud', 'audible', 'napster'],
  Vidéo: ['netflix', 'appletv', 'youtube', 'crunchyroll', 'paramountplus', 'hbomax', 'max', 'mubi', 'twitch', 'dazn', 'plex'],
  'Stockage cloud': ['icloud', 'googledrive', 'dropbox', 'protondrive', 'mega', 'backblaze', 'infomaniak'],
  Jeux: ['playstation', 'steam', 'ubisoft', 'epicgames', 'ea', 'nvidia', 'roblox'],
  Productivité: [
    'notion',
    'evernote',
    'todoist',
    'figma',
    '1password',
    'bitwarden',
    'dashlane',
    'lastpass',
    'nordvpn',
    'protonvpn',
    'expressvpn',
    'surfshark',
    'mullvad',
    'github',
    'githubcopilot',
    'google',
    'proton',
    'protonmail',
    'ovh',
    'scaleway',
    'gandi',
    'obsidian',
    'linear',
    'raycast',
    'setapp',
    'grammarly',
    'deepl',
    'zoom',
    'trello',
    'jetbrains',
  ],
  Presse: ['lequipe', 'medium', 'substack', 'newyorktimes', 'theguardian'],
  'Santé/Sport': ['strava', 'fitbit', 'garmin', 'headspace', 'peloton'],
  IA: ['anthropic', 'claude', 'perplexity', 'mistralai', 'googlegemini', 'cursor', 'elevenlabs'],
  Autre: [
    'duolingo',
    'deliveroo',
    'ubereats',
    'uber',
    'patreon',
    'tinder',
    'revolut',
    'orange',
    'sncf',
    'hellofresh',
    'discord',
    'telegram',
    'coursera',
    'udemy',
    'skillshare',
  ],
};

const bySlug = new Map(
  Object.values(icons)
    .filter((i) => i && i.slug)
    .map((i) => [i.slug, i]),
);
const entries = [];
for (const [category, slugs] of Object.entries(BRANDS)) {
  for (const slug of slugs) {
    const icon = bySlug.get(slug);
    if (!icon) {
      throw new Error(`slug Simple Icons introuvable : ${slug}`);
    }
    entries.push({ slug, title: icon.title, hex: icon.hex, path: icon.path, category });
  }
}

const ts = `// Généré par scripts/gen-brand-icons.mjs depuis simple-icons ${version}. Ne pas modifier à la main.
export interface BrandIcon {
  title: string;
  hex: string;
  path: string;
  category: string;
}

export const SIMPLE_ICONS_VERSION = '${version}';

export const BRAND_ICONS: Readonly<Record<string, BrandIcon>> = ${JSON.stringify(
  Object.fromEntries(entries.map((e) => [e.slug, { title: e.title, hex: e.hex, path: e.path, category: e.category }])),
  null,
  2,
)};
`;
const tsPath = join(here, '..', 'src', 'features', 'subscriptions', 'brand-icons.ts');
writeFileSync(tsPath, ts);
// Le fichier est exclu de Prettier (.prettierignore) : on le met en forme ici pour garder un diff lisible.
execFileSync('npx', ['prettier', '--ignore-path', '/dev/null', '--write', tsPath], { cwd: join(here, '..') });

const go = `// Code généré par apps/mobile/scripts/gen-brand-icons.mjs depuis simple-icons ${version}. NE PAS MODIFIER.

package enrich

var brandIconKeys = map[string]bool{
${entries.map((e) => `\t${JSON.stringify(e.slug)}: true,`).join('\n')}
}
`;
const goPath = join(here, '..', '..', 'enrich', 'brands.go');
writeFileSync(goPath, go);
execFileSync('gofmt', ['-w', goPath]);
console.log(`${entries.length} logos générés (simple-icons ${version})`);
