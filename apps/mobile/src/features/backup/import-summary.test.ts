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
      'Le fichier du 19/11/2026 contient 2 abonnements. Toutes les données actuelles seront remplacées. Une sauvegarde de sécurité est faite avant.',
    );
  });
});
