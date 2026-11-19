import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mark = JSON.parse(readFileSync(join(root, 'ui/brand/sluis-mark.json'), 'utf8'));
const { colors, wave } = mark;

export function wavePath(y, from = wave.from, to = wave.to) {
  const steps = Math.round((to - from) / wave.half);
  return `M${from} ${y} q${wave.half / 2} ${-wave.amplitude} ${wave.half} 0` + ` t${wave.half} 0`.repeat(steps - 1);
}

function markSvg(fill, mono = false) {
  const braces = mark.gates
    .map((g) => `<path d="${g.brace}" stroke="black" stroke-width="${mark.braceWidth}" stroke-linecap="round"/>`)
    .join('');
  const gates = mark.gates
    .map((g) => `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${mark.radius}" fill="${fill}"/>`)
    .join('');
  const walkway = `<rect x="${mark.walkway.x}" y="${mark.walkway.y}" width="${mark.walkway.w}" height="${mark.walkway.h}" rx="${mark.walkway.h / 2}" fill="${fill}"/>`;
  const waves = mark.waves
    .map(
      (w) =>
        `<path d="${wavePath(w.y)}" fill="none" stroke="${mono ? fill : colors[w.color]}" stroke-opacity="${w.opacity}" stroke-width="${wave.width}" stroke-linecap="round"/>`,
    )
    .join('');
  const mask = `<mask id="m"><rect width="1024" height="1024" fill="white"/>${braces}</mask>`;
  return `${mask}${walkway}<g mask="url(#m)">${gates}</g>${waves}`;
}

const background = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colors.bgTop}"/><stop offset="1" stop-color="${colors.bgBottom}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

const outputs = {
  'assets/icon.png': [svg(background + markSvg(colors.gate)), 1024],
  'assets/android-icon-background.png': [svg(background), 1024],
  'assets/android-icon-foreground.png': [svg(markSvg(colors.gate)), 1024],
  'assets/android-icon-monochrome.png': [svg(markSvg('#FFFFFF', true)), 1024],
  'assets/splash-icon.png': [svg(markSvg(colors.gate)), 1024],
  'assets/favicon.png': [svg(background + markSvg(colors.gate)), 48],
};

for (const [file, [source, size]] of Object.entries(outputs)) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(root, file), png);
  console.log(`${file} (${size}px)`);
}
