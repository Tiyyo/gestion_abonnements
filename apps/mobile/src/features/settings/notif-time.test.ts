import { formatNotifTime, notifTimeToDate } from './notif-time';

describe('notifTimeToDate', () => {
  it('reprend l’heure et les minutes enregistrées', () => {
    const date = notifTimeToDate('07:45');
    expect([date.getHours(), date.getMinutes()]).toEqual([7, 45]);
  });
});

describe('formatNotifTime', () => {
  it('complète heures et minutes sur deux chiffres', () => {
    expect(formatNotifTime(new Date(2026, 0, 1, 8, 5))).toBe('08:05');
  });

  it('fait l’aller-retour avec notifTimeToDate', () => {
    expect(formatNotifTime(notifTimeToDate('21:30'))).toBe('21:30');
  });
});
