import { parseAmountCents } from './subscription-form-schema';

describe('parseAmountCents', () => {
  it.each([
    ['9,99', 999],
    ['9.99', 999],
    ['10', 1000],
    ['10,5', 1050],
    ['0,01', 1],
  ])('« %s » donne %i centimes', (input, cents) => {
    expect(parseAmountCents(input)).toBe(cents);
  });
});
