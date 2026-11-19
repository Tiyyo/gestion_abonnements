import {
  addMonthsAnchored,
  businessDayOnOrAfter,
  businessDayOnOrBefore,
  diffDays,
  easterSunday,
  frenchPublicHolidays,
  InvalidDateError,
  isBusinessDay,
  todayIn,
} from './calendar';

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'],
  ])('Pâques %i = %s', (year, date) => {
    expect(easterSunday(year)).toBe(date);
  });
});

describe('frenchPublicHolidays', () => {
  it('contient les 11 jours fériés de 2026, fêtes mobiles comprises', () => {
    expect([...frenchPublicHolidays(2026)].sort()).toEqual([
      '2026-01-01',
      '2026-04-06',
      '2026-05-01',
      '2026-05-08',
      '2026-05-14',
      '2026-05-25',
      '2026-07-14',
      '2026-08-15',
      '2026-11-01',
      '2026-11-11',
      '2026-12-25',
    ]);
  });
});

describe('jours ouvrés', () => {
  it('exclut week-ends et fériés', () => {
    expect(isBusinessDay('2026-11-20')).toBe(true);
    expect(isBusinessDay('2026-11-21')).toBe(false);
    expect(isBusinessDay('2026-11-11')).toBe(false);
  });

  it('recule au vendredi depuis un dimanche', () => {
    expect(businessDayOnOrBefore('2026-11-22')).toBe('2026-11-20');
  });

  it('recule par-dessus un week-end et un lundi de Pâques', () => {
    expect(businessDayOnOrBefore('2026-04-06')).toBe('2026-04-03');
  });

  it("recule par-dessus l'Ascension", () => {
    expect(businessDayOnOrBefore('2026-05-14')).toBe('2026-05-13');
  });

  it('avance au lundi depuis un samedi', () => {
    expect(businessDayOnOrAfter('2026-08-01')).toBe('2026-08-03');
  });

  it('avance par-dessus un week-end suivi du lundi de Pentecôte', () => {
    expect(businessDayOnOrAfter('2026-05-23')).toBe('2026-05-26');
  });
});

describe('addMonthsAnchored', () => {
  it('31 janvier → 28 février → 31 mars, sans dérive', () => {
    expect(addMonthsAnchored('2027-01-31', 1, 31)).toBe('2027-02-28');
    expect(addMonthsAnchored('2027-02-28', 1, 31)).toBe('2027-03-31');
  });

  it('gère les années bissextiles', () => {
    expect(addMonthsAnchored('2028-01-30', 1, 30)).toBe('2028-02-29');
  });

  it('passe l’année', () => {
    expect(addMonthsAnchored('2026-11-21', 3, 21)).toBe('2027-02-21');
    expect(addMonthsAnchored('2026-11-21', 12, 21)).toBe('2027-11-21');
  });
});

describe('validation', () => {
  it('refuse une date inexistante', () => {
    expect(() => diffDays('2026-02-30', '2026-03-01')).toThrow(InvalidDateError);
  });
});

describe('todayIn', () => {
  it('donne la date de Paris, pas celle d’UTC', () => {
    expect(todayIn('Europe/Paris', new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-20');
    expect(todayIn('Europe/Paris', new Date('2026-07-14T21:59:00Z'))).toBe('2026-07-14');
    expect(todayIn('Europe/Paris', new Date('2026-07-14T22:00:00Z'))).toBe('2026-07-15');
  });
});
