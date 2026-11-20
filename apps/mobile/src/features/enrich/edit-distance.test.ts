import { editDistance } from './edit-distance';

describe('editDistance', () => {
  it.each([
    ['netflix', 'netflix', 0],
    ['netflx', 'netflix', 1],
    ['netfilx', 'netflix', 1],
    ['amazoneprime', 'amazonprime', 1],
    ['nteflxi', 'netflix', 2],
    ['spotify', 'shopify', 2],
    ['', 'ab', 2],
  ])('« %s » → « %s » = %i', (a, b, expected) => {
    expect(editDistance(a, b, 3)).toBe(expected);
    expect(editDistance(b, a, 3)).toBe(expected);
  });

  it('s’arrête à max + 1 quand la distance dépasse la borne', () => {
    expect(editDistance('netflix', 'spotify', 2)).toBe(3);
    expect(editDistance('abc', 'abcdefgh', 2)).toBe(3);
  });
});
