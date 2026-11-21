import { daysBeforeLabel, fundingLeadLabel, marginLabel, paydayLabel, THEME_MODES, themeModeLabel } from './labels';

describe('paydayLabel', () => {
  it('écrit « 1er » pour le premier du mois', () => {
    expect(paydayLabel(1)).toBe('le 1er du mois');
  });

  it('écrit le numéro du jour sinon', () => {
    expect(paydayLabel(25)).toBe('le 25 du mois');
  });
});

describe('marginLabel', () => {
  it('affiche la marge en pourcentage avec une espace insécable', () => {
    expect(marginLabel(300)).toBe('3 %');
  });
});

describe('themeModeLabel', () => {
  it('nomme chaque choix d’apparence', () => {
    expect(THEME_MODES.map((m) => themeModeLabel(m.key))).toEqual(['Système', 'Clair', 'Sombre']);
  });
});

describe('fundingLeadLabel', () => {
  it('indique le délai et le report au dernier jour ouvré', () => {
    expect(fundingLeadLabel(2)).toBe('J-2, avancé au dernier jour ouvré');
  });
});

describe('daysBeforeLabel', () => {
  it('lit les J-n en clair', () => {
    expect(daysBeforeLabel(1)).toBe('1 jour avant');
    expect(daysBeforeLabel(7)).toBe('7 jours avant');
  });
});
