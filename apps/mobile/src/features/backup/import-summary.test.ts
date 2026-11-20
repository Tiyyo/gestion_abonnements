import type { ExportFile } from '@/db/backup';
import { importConfirmMessage, subscriptionCount } from './import-summary';

describe('subscriptionCount', () => {
  it('accorde « abonnement » au pluriel au-delà de un', () => {
    expect(subscriptionCount(0)).toBe('0 abonnement');
    expect(subscriptionCount(1)).toBe('1 abonnement');
    expect(subscriptionCount(2)).toBe('2 abonnements');
  });
});

describe('importConfirmMessage', () => {
  it('annonce la date du fichier et le nombre d’abonnements', () => {
    const file = { exportedAt: '2026-11-19T08:00:00.000Z', tables: { subscription: [{}, {}] } } as unknown as ExportFile;
    expect(importConfirmMessage(file)).toBe(
      'Le fichier du 19\u00a0nov.\u00a02026 contient 2 abonnements. Toutes les données actuelles seront remplacées. Une sauvegarde de sécurité est faite avant.',
    );
  });

  it('prend le jour de Paris, et se passe de date si elle est illisible', () => {
    const late = { exportedAt: '2026-12-31T23:30:00.000Z', tables: { subscription: [{}] } } as unknown as ExportFile;
    expect(importConfirmMessage(late)).toMatch(/^Le fichier du 1er\u00a0janv\.\u00a02027 contient 1 abonnement\./);
    const broken = { exportedAt: 'hier', tables: { subscription: [{}] } } as unknown as ExportFile;
    expect(importConfirmMessage(broken)).toMatch(/^Le fichier contient 1 abonnement\./);
  });
});
