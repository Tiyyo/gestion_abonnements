import { balancesUrl } from './function-config';

describe('balancesUrl', () => {
  it('ajoute la route sans doubler la barre', () => {
    expect(balancesUrl('https://fn.example/')).toBe('https://fn.example/balances');
    expect(balancesUrl('https://fn.example')).toBe('https://fn.example/balances');
  });
});
