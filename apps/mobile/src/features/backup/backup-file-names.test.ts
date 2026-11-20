import { exportFileName, safetyBackupFileName } from './backup-file-names';

describe('exportFileName', () => {
  it('date le fichier exporté', () => {
    expect(exportFileName('2026-11-20')).toBe('abonnements-2026-11-20.json');
  });
});

describe('safetyBackupFileName', () => {
  it('remplace les deux-points et les points de l’horodatage', () => {
    expect(safetyBackupFileName(new Date('2026-11-20T10:11:12.345Z'))).toBe('sauvegarde-avant-import-2026-11-20T10-11-12-345Z.json');
  });
});
