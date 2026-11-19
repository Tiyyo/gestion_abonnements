import { isBrandIconKey, matchBrand } from './brands';

describe('matchBrand', () => {
  it.each([
    ['Spotify', 'spotify', 'cat-musique'],
    ['spotify premium', 'spotify', 'cat-musique'],
    ['Apple TV+', 'appletv', 'cat-video'],
    ['YouTube Music', 'youtubemusic', 'cat-musique'],
    ['YouTube Premium', 'youtube', 'cat-video'],
    ['iCloud+', 'icloud', 'cat-cloud'],
    ['L’Équipe', 'lequipe', 'cat-presse'],
  ])('« %s » donne %s', (name, iconKey, categoryId) => {
    expect(matchBrand(name)).toMatchObject({ iconKey, categoryId });
  });

  it('ne devine rien pour un nom inconnu ou trop court', () => {
    expect(matchBrand('Disney+')).toBeNull();
    expect(matchBrand('Nom de domaine')).toBeNull();
    expect(matchBrand('x')).toBeNull();
  });

  it('reconnaît les clés de logo embarquées', () => {
    expect(isBrandIconKey('netflix')).toBe(true);
    expect(isBrandIconKey('tag')).toBe(false);
  });
});
