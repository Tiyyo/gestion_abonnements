// Contrastes WCAG 2.x des paires texte / fond réellement utilisées, en clair et en sombre (jetons de src/theme/palette.ts).
// Usage : node scripts/a11y-contrast.mjs [--md]   (code de sortie 1 si une paire passe sous son seuil)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/theme/palette.ts'), 'utf8');
const tokensOf = (start) => {
  const block = source.slice(source.indexOf(start), source.indexOf('};', source.indexOf(start)) + 1);
  return Object.fromEntries([...block.matchAll(/^\s+(\w+): '([^']+)'/gm)].map((m) => [m[1], m[2]]));
};
const lightTokens = tokensOf('export const lightPalette = {');
// La palette sombre reprend la claire (`...lightPalette`) et n'en remplace que certains jetons.
const darkTokens = { ...lightTokens, ...tokensOf('export const darkPalette: Palette = {') };

function parse(value) {
  if (value.startsWith('#')) {
    return { r: parseInt(value.slice(1, 3), 16), g: parseInt(value.slice(3, 5), 16), b: parseInt(value.slice(5, 7), 16), a: 1 };
  }
  const [r, g, b, a = 1] = value.match(/[\d.]+/g).map(Number);
  return { r, g, b, a };
}
/** Couleur `top` (éventuellement translucide) posée sur un fond opaque. */
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});
const stack = (...layers) => layers.reduceRight((bottom, top) => over(top, bottom));
const alpha = (color, a) => ({ ...color, a: color.a * a });
const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
function contrast(fg, bg) {
  const [hi, lo] = [luminance(over(fg, bg)), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Dégradé du Hero (ui/surfaces/hero.tsx) : pire cas = lueur pêche à pleine intensité sur le départ du dégradé (le plus clair).
const heroSource = readFileSync(join(root, 'src/ui/surfaces/hero.tsx'), 'utf8');
const warmAlpha = Number(heroSource.match(/const WARM_ALPHA = ([\d.]+);/)[1]);
const coolAlpha = Number(heroSource.match(/const COOL_ALPHA = ([\d.]+);/)[1]);
const white = parse('#FFFFFF');
const splashBg = parse(JSON.parse(readFileSync(join(root, 'src/ui/brand/sluis-mark.json'), 'utf8')).colors.bg);

// [zone, texte, fond, couleur du texte, couleur du fond, seuil, usage]
function pairsFor(tokens) {
  const t = Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, parse(v)]));
  const heroPeach = over(alpha(t.heroGlowWarm, warmAlpha), t.heroFrom);
  const heroCool = over(alpha(t.heroGlowCool, coolAlpha), t.heroTo);
  const glassCard = (hero) => over(t.glassFill, hero);
  const glassPanel = (hero) => stack(t.glassInner, t.glassFill, hero);
  const glassChip = (hero) => stack(t.glassFill, t.glassFill, hero);
  const barOver = (content) => over(t.barFill, content);

  return [
    ['Clair', 'color', 'background', t.color, t.background, 4.5, 'texte courant'],
    ['Clair', 'color', 'surface', t.color, t.surface, 4.5, 'cartes, listes'],
    ['Clair', 'color', 'subtle', t.color, t.subtle, 4.5, 'aperçu du financement'],
    ['Clair', 'colorMuted', 'background', t.colorMuted, t.background, 4.5, 'légendes, surtitres'],
    ['Clair', 'colorMuted', 'surface', t.colorMuted, t.surface, 4.5, 'légendes dans les cartes, texte indicatif des champs'],
    ['Clair', 'colorMuted', 'subtle', t.colorMuted, t.subtle, 4.5, 'segment non choisi, badge « Résilié », bouton désactivé'],
    ['Clair', 'primaryText', 'surface', t.primaryText, t.surface, 4.5, 'montant du prochain transfert, bouton fantôme'],
    ['Clair', 'primaryText', 'background', t.primaryText, t.background, 4.5, 'bouton fantôme, « Afficher »'],
    ['Clair', 'primaryText', 'primarySoft', t.primaryText, t.primarySoft, 4.5, 'bouton doux'],
    ['Clair', 'onSecondary', 'secondary', t.onSecondary, t.secondary, 4.5, 'bouton pêche, puce choisie'],
    ['Clair', 'onPrimary', 'primary', t.onPrimary, t.primary, 4.5, 'bouton principal, capsule d’onglet, verrou'],
    ['Clair', 'onPrimary', 'warnSolid', t.onPrimary, t.warnSolid, 4.5, 'bouton d’alerte plein'],
    ['Clair', 'onPrimary', 'dangerSolid', t.onPrimary, t.dangerSolid, 4.5, 'bouton destructif plein'],
    ['États', 'warnText', 'warnBg', t.warnText, t.warnBg, 4.5, 'cartes d’alerte, badge « Essai »'],
    ['États', 'color', 'warnBg', t.color, t.warnBg, 4.5, 'titre et corps des cartes d’alerte'],
    ['États', 'warnText', 'surface', t.warnText, t.surface, 4.5, '« Reporté » dans une ligne de transfert'],
    ['États', 'warnText', 'background', t.warnText, t.background, 4.5, 'couverture du coffre (Plan), refus des notifications'],
    ['États', 'okText', 'okBg', t.okText, t.okBg, 4.5, 'carte « aucun risque », badge « Actif »'],
    ['États', 'okText', 'surface', t.okText, t.surface, 4.5, '« Alimenté », « Virement fait »'],
    ['États', 'okText', 'background', t.okText, t.background, 4.5, 'couverture du coffre (Plan)'],
    ['États', 'dangerText', 'dangerBg', t.dangerText, t.dangerBg, 4.5, 'transfert en retard, badge « À résilier »'],
    ['États', 'dangerText', 'surface', t.dangerText, t.surface, 4.5, 'bouton destructif contour'],
    ['États', 'dangerText', 'background', t.dangerText, t.background, 4.5, 'erreurs de champ'],
    ['Non textuel', 'surface', 'okText', t.surface, t.okText, 3, 'coche du transfert fait (calendrier)'],
    ['Non textuel', 'borderControl', 'surface', t.borderControl, t.surface, 3, 'bordure des champs et puces, piste d’interrupteur coupé'],
    ['Non textuel', 'borderControl', 'background', t.borderControl, t.background, 3, 'bordure des champs sur le fond'],
    ['Non textuel', 'surface', 'borderControl', t.surface, t.borderControl, 3, 'pastille de l’interrupteur coupé'],
    ['Non textuel', 'primary', 'subtle', t.primary, t.subtle, 3, 'barres de catégorie, progression du premier lancement'],
    ['Barre d’onglets', 'colorMuted', 'barFill sur background', t.colorMuted, barOver(t.background), 4.5, 'libellé d’onglet inactif'],
    [
      'Barre d’onglets',
      'colorMuted',
      'barFill sur primary',
      t.colorMuted,
      barOver(t.primary),
      4.5,
      'libellé inactif, bouton principal derrière (sans flou)',
    ],
    [
      'Barre d’onglets',
      'colorMuted',
      'barFill sur heroTo',
      t.colorMuted,
      barOver(t.heroTo),
      4.5,
      'libellé inactif, contenu le plus sombre derrière (sans flou)',
    ],
    ['Hero', 'onGlass', 'heroFrom', t.onGlass, t.heroFrom, 4.5, 'titre d’écran, en-tête de feuille'],
    ['Hero', 'onGlass', 'hero + lueur pêche', t.onGlass, heroPeach, 4.5, 'titre sous la lueur (pire cas)'],
    ['Hero', 'onGlassMuted', 'heroFrom', t.onGlassMuted, t.heroFrom, 4.5, 'surtitre, légende'],
    ['Hero', 'onGlassMuted', 'hero + lueur pêche', t.onGlassMuted, heroPeach, 4.5, 'surtitre sous la lueur (pire cas)'],
    ['Hero', 'onGlassMuted', 'hero + lueur violette', t.onGlassMuted, heroCool, 4.5, 'titre de section sur le bas du Hero'],
    ['Hero', 'onGlassDanger', 'hero + lueur pêche', t.onGlassDanger, heroPeach, 4.5, 'erreur du formulaire sur le Hero'],
    ['Verre', 'onGlass', 'glassFill + lueur pêche', t.onGlass, glassCard(heroPeach), 4.5, 'montant, bouton d’icône en verre'],
    [
      'Verre',
      'onGlassMuted',
      'glassFill sur heroFrom',
      t.onGlassMuted,
      glassCard(t.heroFrom),
      4.5,
      'légende de carte en verre (cas courant)',
    ],
    [
      'Verre',
      'onGlassMuted',
      'glassFill + lueur pêche',
      t.onGlassMuted,
      glassCard(heroPeach),
      4.5,
      'légende de carte en verre, texte indicatif (pire cas)',
    ],
    ['Verre', 'onGlass', 'glassInner + glassFill + lueur', t.onGlass, glassPanel(heroPeach), 4.5, 'montant d’un panneau'],
    [
      'Verre',
      'onGlassMuted',
      'glassInner + glassFill + lueur',
      t.onGlassMuted,
      glassPanel(heroPeach),
      4.5,
      'légende d’un panneau, état « coupé » (pire cas)',
    ],
    ['Verre', 'onGlassMuted', 'glassInner + lueur pêche', t.onGlassMuted, over(t.glassInner, heroPeach), 4.5, 'segment non choisi'],
    ['Verre', 'onGlass', 'glassFill ×2 + lueur pêche', t.onGlass, glassChip(heroPeach), 4.5, 'pastille d’actualisation'],
    ['Verre', 'onGlassOk', 'glassFill + lueur pêche', t.onGlassOk, glassCard(heroPeach), 4.5, 'message « le coffre couvre »'],
    ['Verre', 'onGlassOk', 'glassInner + glassFill + lueur', t.onGlassOk, glassPanel(heroPeach), 4.5, 'état d’un service'],
    ['Verre', 'onGlassWarn', 'glassFill + lueur pêche', t.onGlassWarn, glassCard(heroPeach), 4.5, 'message d’alerte'],
    ['Verre', 'onGlassWarn', 'glassInner + glassFill + lueur', t.onGlassWarn, glassPanel(heroPeach), 4.5, 'état d’un service'],
    ['Verre', 'onGlassDanger', 'glassFill + lueur pêche', t.onGlassDanger, glassCard(heroPeach), 4.5, 'accord expiré'],
    ['Désactivé', 'colorMuted', 'subtle', t.colorMuted, t.subtle, 3, 'libellé de bouton désactivé (exempté par WCAG, indicatif)'],
    ['Désactivé', 'onGlassMuted', 'heroFrom', t.onGlassMuted, t.heroFrom, 3, '« Annuler » désactivé sur le Hero (exempté, indicatif)'],
    ['Marque', 'blanc', 'fond de l’écran de démarrage', white, splashBg, 4.5, 'mot « Sluis »'],
  ];
}

const pairs = [...pairsFor(lightTokens), ...pairsFor(darkTokens).map(([group, ...rest]) => [`Sombre · ${group}`, ...rest])];

// Initiales des avatars (features/subscriptions/components/subscription-avatar.tsx).
const avatar = readFileSync(join(root, 'src/features/subscriptions/components/subscription-avatar.tsx'), 'utf8');
for (const [, bg, fg] of avatar.matchAll(/\['(#[0-9A-F]{6})', '(#[0-9A-F]{6})'\]/g)) {
  pairs.push(['Avatar', fg, bg, parse(fg), parse(bg), 3, 'initiale (grand texte gras, décoratif)']);
}

let failed = 0;
const rows = pairs.map(([group, fgName, bgName, fg, bg, min, usage]) => {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  failed += ok ? 0 : 1;
  return { group, fgName, bgName, ratio: ratio.toFixed(2).replace('.', ','), min: String(min).replace('.', ','), ok, usage };
});

if (process.argv.includes('--md')) {
  console.log('| Zone | Texte | Fond | Contraste | Seuil | Résultat | Usage |\n|---|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(
      `| ${r.group} | \`${r.fgName}\` | ${r.bgName} | ${r.ratio}:1 | ${r.min}:1 | ${r.ok ? 'conforme' : '**insuffisant**'} | ${r.usage} |`,
    );
  }
} else {
  for (const r of rows) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.ratio.padStart(6)}:1 (≥ ${r.min})  ${r.group} · ${r.fgName} / ${r.bgName} — ${r.usage}`);
  }
}
if (failed > 0) {
  console.error(`${failed} paire(s) sous le seuil.`);
  process.exit(1);
}
