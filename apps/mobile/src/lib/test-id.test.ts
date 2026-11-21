import { testIdSlug } from './test-id';

describe('testIdSlug', () => {
  it('met en minuscules et remplace les espaces par des tirets', () => {
    expect(testIdSlug('E2E Hebdo')).toBe('e2e-hebdo');
  });

  it('retire les accents et la ponctuation', () => {
    expect(testIdSlug('  Canal+ Séries (été) ')).toBe('canal-series-ete');
  });

  it('rend une chaîne vide pour un libellé sans lettre ni chiffre', () => {
    expect(testIdSlug('—')).toBe('');
  });
});
