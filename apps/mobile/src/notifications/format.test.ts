import { inDays, reminderDays, shortDate } from './format';

describe('shortDate', () => {
  it('écrit le jour et le mois abrégé', () => {
    expect(shortDate('2026-12-05')).toBe('5 déc');
    expect(shortDate('2026-02-28')).toBe('28 févr');
  });
});

describe('reminderDays', () => {
  it('ne garde que des jours entiers entre 1 et 30', () => {
    expect(reminderDays('[3, 1, 0, 31, 2.5, "7", 30]')).toEqual([3, 1, 30]);
  });

  it('rend une liste vide pour un JSON invalide ou qui n’est pas une liste', () => {
    expect(reminderDays('pas du json')).toEqual([]);
    expect(reminderDays('{"a":1}')).toEqual([]);
  });
});

describe('inDays', () => {
  it('dit « demain » pour un jour', () => {
    expect(inDays(1)).toBe('demain');
    expect(inDays(3)).toBe('dans 3 jours');
  });
});
