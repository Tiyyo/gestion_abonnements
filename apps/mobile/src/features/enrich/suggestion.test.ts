import { fromBrand, fromCorrection, isAutoApplicable, localSuggestion, shouldOfferSuggestion, type Suggestion } from './suggestion';

const netflix = { iconKey: 'netflix', categoryId: 'cat-video', title: 'Netflix', confidence: 1 };
const ai: Suggestion = { source: 'ai', categoryId: 'cat-video', iconKey: 'netflix', cancelUrl: null, trialDays: null, confidence: 0.95 };

describe('suggestion', () => {
  it('reprend la correction de l’utilisateur sans lien ni durée d’essai', () => {
    expect(fromCorrection({ category_id: 'cat-video', icon_key: 'netflix' })).toEqual({
      source: 'correction',
      categoryId: 'cat-video',
      iconKey: 'netflix',
      cancelUrl: null,
      trialDays: null,
      confidence: 1,
    });
  });

  it('ignore un logo de correction absent de la liste embarquée, garde le choix de l’initiale', () => {
    expect(fromCorrection({ category_id: 'cat-autre', icon_key: 'inconnu_xyz' }).iconKey).toBeNull();
    expect(fromCorrection({ category_id: 'cat-autre', icon_key: 'tag' }).iconKey).toBeNull();
    expect(fromCorrection({ category_id: 'cat-autre', icon_key: null }).iconKey).toBeNull();
    expect(fromCorrection({ category_id: 'cat-autre', icon_key: 'initial' }).iconKey).toBe('initial');
  });

  it('reprend la marque reconnue et sa confiance', () => {
    expect(fromBrand({ ...netflix, confidence: 0.86 })).toEqual({
      source: 'brand',
      categoryId: 'cat-video',
      iconKey: 'netflix',
      cancelUrl: null,
      trialDays: null,
      confidence: 0.86,
    });
  });

  it('préfère la correction apprise à la marque reconnue', () => {
    expect(localSuggestion({ category_id: 'cat-musique', icon_key: 'spotify' }, netflix)?.source).toBe('correction');
    expect(localSuggestion(undefined, netflix)?.source).toBe('brand');
    expect(localSuggestion(undefined, null)).toBeNull();
  });
});

describe('application d’office', () => {
  it('vaut pour une correction ou une marque sûre, jamais pour l’IA ni une ressemblance incertaine', () => {
    expect(isAutoApplicable(fromCorrection({ category_id: 'cat-video', icon_key: null }))).toBe(true);
    expect(isAutoApplicable(fromBrand(netflix))).toBe(true);
    expect(isAutoApplicable(fromBrand({ ...netflix, confidence: 0.8 }))).toBe(false);
    expect(isAutoApplicable(ai)).toBe(false);
    expect(isAutoApplicable(null)).toBe(false);
  });

  it('ne montre pas la carte pour ce qui s’applique d’office', () => {
    expect(shouldOfferSuggestion(fromBrand(netflix), { categoryId: 'cat-autre', iconKey: null }, false)).toBe(false);
  });

  it('montre la carte après un choix manuel différent, ou pour une marque incertaine', () => {
    expect(shouldOfferSuggestion(fromBrand(netflix), { categoryId: 'cat-musique', iconKey: null }, true)).toBe(true);
    expect(shouldOfferSuggestion(fromBrand({ ...netflix, confidence: 0.8 }), { categoryId: 'cat-autre', iconKey: null }, false)).toBe(true);
  });

  it('montre la suggestion de l’IA seulement si elle apporte quelque chose', () => {
    const applied = { categoryId: 'cat-video', iconKey: 'netflix' };
    expect(shouldOfferSuggestion(ai, { categoryId: 'cat-autre', iconKey: null }, false)).toBe(true);
    expect(shouldOfferSuggestion(ai, applied, false)).toBe(false);
    expect(shouldOfferSuggestion({ ...ai, iconKey: null }, applied, false)).toBe(false);
    expect(shouldOfferSuggestion({ ...ai, cancelUrl: 'https://www.netflix.com/cancelplan' }, applied, false)).toBe(true);
    expect(shouldOfferSuggestion({ ...ai, trialDays: 30 }, applied, false)).toBe(true);
  });
});
