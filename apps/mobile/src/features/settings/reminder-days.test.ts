import { parseDays, reminderLabel, toggleReminderDay } from './reminder-days';

describe('parseDays', () => {
  it('lit une liste JSON de jours', () => {
    expect(parseDays('[7,1]')).toEqual([7, 1]);
  });

  it('ignore les valeurs non entières', () => {
    expect(parseDays('[7,"3",1.5,null,1]')).toEqual([7, 1]);
  });

  it('renvoie une liste vide pour un JSON invalide ou qui n’est pas une liste', () => {
    expect(parseDays('pas du json')).toEqual([]);
    expect(parseDays('{"a":1}')).toEqual([]);
  });
});

describe('reminderLabel', () => {
  it('affiche « Aucun » sans rappel', () => {
    expect(reminderLabel([])).toBe('Aucun');
  });

  it('liste les jours avec « et »', () => {
    expect(reminderLabel([7, 3, 1])).toBe('J-7 et J-3 et J-1');
  });
});

describe('toggleReminderDay', () => {
  it('ajoute un jour en gardant l’ordre décroissant', () => {
    expect(toggleReminderDay([7, 1], 3)).toEqual([7, 3, 1]);
  });

  it('retire un jour déjà présent', () => {
    expect(toggleReminderDay([7, 3, 1], 3)).toEqual([7, 1]);
  });
});
