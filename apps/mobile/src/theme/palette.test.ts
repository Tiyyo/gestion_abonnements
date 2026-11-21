import { composite, contrastRatio } from './contrast';
import { type Palette, palettes, type Scheme } from './palette';

type Token = keyof Palette;
/** [premier plan, fond, fond sous un fond translucide (facultatif)] */
type Pair = readonly [Token, Token, Token?];

const TEXT_MIN = 4.5;
const CONTROL_MIN = 3;

// Texte et icônes porteuses de sens : 4,5:1.
const TEXT_PAIRS: readonly Pair[] = [
  ['color', 'background'],
  ['color', 'surface'],
  ['color', 'subtle'],
  ['color', 'raised'],
  ['color', 'primarySoft'],
  ['color', 'warnBg'],
  ['color', 'okBg'],
  ['color', 'dangerBg'],
  ['colorMuted', 'background'],
  ['colorMuted', 'surface'],
  ['colorMuted', 'subtle'],
  ['primaryText', 'background'],
  ['primaryText', 'surface'],
  ['primaryText', 'subtle'],
  ['primaryText', 'raised'],
  ['primaryText', 'primarySoft'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'warnSolid'],
  ['onPrimary', 'dangerSolid'],
  ['onSecondary', 'secondary'],
  ['warnText', 'warnBg'],
  ['warnText', 'surface'],
  ['warnText', 'background'],
  ['okText', 'okBg'],
  ['okText', 'surface'],
  ['okText', 'background'],
  ['surface', 'okText'],
  ['dangerText', 'dangerBg'],
  ['dangerText', 'surface'],
  ['dangerText', 'background'],
  ['colorMuted', 'barFill', 'background'],
  ['colorMuted', 'barFill', 'surface'],
  ['onGlass', 'heroFrom'],
  ['onGlass', 'heroTo'],
  ['onGlassMuted', 'heroFrom'],
  ['onGlassMuted', 'glassFill', 'heroFrom'],
  ['onGlassOk', 'glassFill', 'heroFrom'],
  ['onGlassWarn', 'glassFill', 'heroFrom'],
  ['onGlassDanger', 'glassFill', 'heroFrom'],
];

// Contours de contrôles, aplats et indicateurs (barres, pastilles, interrupteur) : 3:1.
const CONTROL_PAIRS: readonly Pair[] = [
  ['borderControl', 'surface'],
  ['borderControl', 'background'],
  ['primary', 'surface'],
  ['primary', 'background'],
  ['primary', 'subtle'],
  ['warnSolid', 'surface'],
  ['warnSolid', 'warnBg'],
  ['dangerSolid', 'surface'],
  ['thumb', 'primary'],
  ['thumb', 'borderControl'],
  ['okText', 'surface'],
];

function measure(palette: Palette, [front, back, under]: Pair): number {
  const backdrop = under ? composite(palette[back], palette[under]) : palette[back];
  return contrastRatio(palette[front], backdrop);
}

describe.each(['light', 'dark'] as Scheme[])('palette %s', (scheme) => {
  const palette = palettes[scheme];

  for (const pair of TEXT_PAIRS) {
    it(`${pair.join(' / ')} : texte ≥ 4,5:1`, () => {
      expect(measure(palette, pair)).toBeGreaterThanOrEqual(TEXT_MIN);
    });
  }

  for (const pair of CONTROL_PAIRS) {
    it(`${pair.join(' / ')} : contrôle ≥ 3:1`, () => {
      expect(measure(palette, pair)).toBeGreaterThanOrEqual(CONTROL_MIN);
    });
  }
});

describe('palette sombre', () => {
  it('garde les mêmes tokens que la palette claire', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  it('étage les surfaces du plus sombre au plus clair', () => {
    const { background, surface, subtle, raised } = palettes.dark;
    const steps = [background, surface, subtle, raised].map((c) => contrastRatio(c, '#000000'));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });

  it('la barre d’onglets reste lisible au-dessus du Hero et d’un contenu clair (tuile de logo, bouton pêche)', () => {
    const { colorMuted, barFill, logoTile, secondary, heroFrom } = palettes.dark;
    expect(contrastRatio(colorMuted, composite(barFill, heroFrom))).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(contrastRatio(colorMuted, composite(barFill, logoTile))).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(contrastRatio(colorMuted, composite(barFill, secondary))).toBeGreaterThanOrEqual(TEXT_MIN);
  });
});
