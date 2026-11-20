// Image d'aperçu du widget « Prochain transfert » dans le sélecteur de widgets (Android 11 et moins ;
// Android 12+ affiche plutôt res/layout/sluis_widget_preview.xml). Usage : node scripts/gen-widget-preview.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'modules/sluis-widget/android/src/main/res/drawable-nodpi/sluis_widget_preview.png');

// 4×1 environ 320 × 80 dp, rendu à 3x.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240" viewBox="0 0 320 80">
  <rect width="320" height="80" rx="16" fill="#4C1E4F"/>
  <text x="16" y="32" font-family="Roboto, sans-serif" font-size="12" fill="#F6D5C4">Demain · 24 nov</text>
  <text x="16" y="60" font-family="Roboto, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">12,35 €</text>
  <text x="304" y="51" text-anchor="end" font-family="Roboto, sans-serif" font-size="12" fill="#FFFFFF" fill-opacity="0.85">Pour Spotify</text>
</svg>`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log(out);
