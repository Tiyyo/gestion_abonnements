import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const icons = require('simple-icons');
const here = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(dirname(require.resolve('simple-icons')), 'package.json'), 'utf8')).version;

const BRANDS = {
  Musique: ['spotify', 'deezer', 'applemusic', 'tidal', 'youtubemusic', 'soundcloud', 'audible'],
  Vidéo: ['netflix', 'appletv', 'youtube', 'crunchyroll', 'paramountplus', 'hbomax', 'max', 'mubi', 'twitch'],
  'Stockage cloud': ['icloud', 'googledrive', 'dropbox', 'protondrive', 'mega'],
  Jeux: ['playstation', 'steam', 'ubisoft'],
  Productivité: [
    'notion',
    'evernote',
    'todoist',
    'figma',
    '1password',
    'bitwarden',
    'dashlane',
    'nordvpn',
    'protonvpn',
    'expressvpn',
    'surfshark',
    'github',
    'githubcopilot',
    'google',
    'proton',
    'protonmail',
    'ovh',
    'scaleway',
  ],
  Presse: ['lequipe', 'medium', 'substack'],
  'Santé/Sport': ['strava', 'fitbit', 'garmin', 'headspace'],
  IA: ['anthropic', 'claude', 'perplexity'],
  Autre: ['duolingo', 'deliveroo', 'ubereats', 'uber', 'patreon', 'tinder', 'revolut', 'orange'],
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
writeFileSync(join(here, '..', 'src', 'features', 'subscriptions', 'brand-icons.ts'), ts);

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
