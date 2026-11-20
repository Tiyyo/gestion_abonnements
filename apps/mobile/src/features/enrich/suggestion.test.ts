import { fromBrand, fromCorrection } from './suggestion';

describe('suggestion', () => {
  it('reprend la correction de l’utilisateur sans lien ni durée d’essai', () => {
    expect(fromCorrection({ category_id: 'cat-video', icon_key: 'netflix' })).toEqual({
      source: 'correction',
      categoryId: 'cat-video',
      iconKey: 'netflix',
      cancelUrl: null,
      trialDays: null,
    });
  });

  it('ignore un logo de correction absent de la liste embarquée', () => {
    expect(fromCorrection({ category_id: 'cat-autre', icon_key: 'inconnu_xyz' }).iconKey).toBeNull();
    expect(fromCorrection({ category_id: 'cat-autre', icon_key: null }).iconKey).toBeNull();
  });

  it('reprend la marque reconnue', () => {
    const brand = { iconKey: 'netflix', categoryId: 'cat-video', brand: { title: 'Netflix' } } as never;
    expect(fromBrand(brand)).toEqual({ source: 'brand', categoryId: 'cat-video', iconKey: 'netflix', cancelUrl: null, trialDays: null });
  });
});
