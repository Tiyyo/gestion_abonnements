import { nowIso } from './now-iso';

describe('nowIso', () => {
  it('tronque les millisecondes', () => {
    expect(nowIso(new Date('2026-11-20T08:15:30.123Z'))).toBe('2026-11-20T08:15:30Z');
  });
});
