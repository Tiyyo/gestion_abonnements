import { reminderDays } from './format';

describe('reminderDays', () => {
  it('ne garde que des jours entiers entre 1 et 30', () => {
    expect(reminderDays('[3, 1, 0, 31, 2.5, "7", 30]')).toEqual([3, 1, 30]);
  });

  it('rend une liste vide pour un JSON invalide ou qui n’est pas une liste', () => {
    expect(reminderDays('pas du json')).toEqual([]);
    expect(reminderDays('{"a":1}')).toEqual([]);
  });
});
