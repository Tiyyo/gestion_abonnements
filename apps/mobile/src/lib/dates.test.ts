import {
  capitalize,
  dateLong,
  dateOfTimestamp,
  dateShort,
  dateShortYear,
  dateWithWeekday,
  monthTile,
  monthYearTitle,
  relativeDay,
} from './dates';

const S = '\u00a0';

describe('dateShort', () => {
  it.each([
    ['2026-01-15', `15${S}janv.`],
    ['2026-02-28', `28${S}févr.`],
    ['2026-03-09', `9${S}mars`],
    ['2026-04-30', `30${S}avr.`],
    ['2026-05-17', `17${S}mai`],
    ['2026-06-02', `2${S}juin`],
    ['2026-07-14', `14${S}juil.`],
    ['2026-08-03', `3${S}août`],
    ['2026-09-21', `21${S}sept.`],
    ['2026-10-31', `31${S}oct.`],
    ['2026-11-27', `27${S}nov.`],
    ['2026-12-05', `5${S}déc.`],
  ])('abrège %s en %s', (date, label) => {
    expect(dateShort(date)).toBe(label);
  });

  it('écrit « 1er » pour le premier du mois', () => {
    expect(dateShort('2026-12-01')).toBe(`1er${S}déc.`);
  });

  it('ajoute l’année seulement quand elle diffère de celle du jour', () => {
    expect(dateShort('2026-11-27', '2026-11-20')).toBe(`27${S}nov.`);
    expect(dateShort('2027-01-05', '2026-11-20')).toBe(`5${S}janv.${S}2027`);
    expect(dateShort('2025-12-31', '2026-01-01')).toBe(`31${S}déc.${S}2025`);
  });

  it('ne contient aucune espace sécable', () => {
    expect(dateShort('2027-01-05', '2026-11-20')).not.toContain(' ');
  });
});

describe('dateShortYear', () => {
  it('affiche toujours l’année', () => {
    expect(dateShortYear('2027-05-17')).toBe(`17${S}mai${S}2027`);
    expect(dateShortYear('2026-11-20')).toBe(`20${S}nov.${S}2026`);
  });
});

describe('dateWithWeekday', () => {
  it.each([
    ['2026-11-22', `dim.${S}22${S}nov.`],
    ['2026-11-23', `lun.${S}23${S}nov.`],
    ['2026-11-24', `mar.${S}24${S}nov.`],
    ['2026-11-25', `mer.${S}25${S}nov.`],
    ['2026-11-26', `jeu.${S}26${S}nov.`],
    ['2026-11-27', `ven.${S}27${S}nov.`],
    ['2026-11-28', `sam.${S}28${S}nov.`],
  ])('nomme le jour de %s', (date, label) => {
    expect(dateWithWeekday(date)).toBe(label);
  });

  it('ajoute l’année quand elle diffère', () => {
    expect(dateWithWeekday('2027-01-01', '2026-11-20')).toBe(`ven.${S}1er${S}janv.${S}2027`);
    expect(dateWithWeekday('2026-12-31', '2026-11-20')).toBe(`jeu.${S}31${S}déc.`);
  });

  it('ne dépend pas de l’heure d’été (dernier dimanche de mars et d’octobre)', () => {
    expect(dateWithWeekday('2026-03-29')).toBe(`dim.${S}29${S}mars`);
    expect(dateWithWeekday('2026-10-25')).toBe(`dim.${S}25${S}oct.`);
  });
});

describe('dateLong', () => {
  it('écrit le jour et le mois en toutes lettres, en minuscules', () => {
    expect(dateLong('2026-11-20')).toBe(`vendredi${S}20${S}novembre`);
    expect(dateLong('2026-08-01')).toBe(`samedi${S}1er${S}août`);
  });

  it('ajoute l’année quand elle diffère', () => {
    expect(dateLong('2027-02-14', '2026-11-20')).toBe(`dimanche${S}14${S}février${S}2027`);
  });
});

describe('monthYearTitle', () => {
  it('met la majuscule au mois', () => {
    expect(monthYearTitle(2026, 11)).toBe(`Novembre${S}2026`);
    expect(monthYearTitle(2027, 8)).toBe(`Août${S}2027`);
  });
});

describe('monthTile', () => {
  it('donne le mois abrégé sans point', () => {
    expect(monthTile('2026-11-20')).toBe('nov');
    expect(monthTile('2026-08-03')).toBe('août');
    expect(monthTile('2026-02-03')).toBe('févr');
  });
});

describe('relativeDay', () => {
  it.each([
    [0, 'aujourd’hui'],
    [1, 'demain'],
    [3, `dans 3${S}jours`],
    [-1, 'hier'],
    [-4, `il y a 4${S}jours`],
  ])('à %i jour(s) : %s', (days, label) => {
    expect(relativeDay(days)).toBe(label);
  });
});

describe('dateOfTimestamp', () => {
  it('donne le jour à Paris, pas le jour UTC', () => {
    expect(dateOfTimestamp('2026-11-20T23:30:00.000Z')).toBe('2026-11-21');
    expect(dateOfTimestamp('2026-07-14T21:59:00.000Z')).toBe('2026-07-14');
    expect(dateOfTimestamp('2026-07-14T22:00:00.000Z')).toBe('2026-07-15');
  });
});

describe('capitalize', () => {
  it('met la première lettre en majuscule', () => {
    expect(capitalize(dateWithWeekday('2026-11-27'))).toBe(`Ven.${S}27${S}nov.`);
  });
});
