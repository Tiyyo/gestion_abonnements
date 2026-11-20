import { formatEuros } from '@abonnements/core';
import { eventLabel, reminderLabel } from './history';

describe('eventLabel', () => {
  it('décrit la création', () => {
    expect(eventLabel('status_change', JSON.stringify({ from: null, to: 'trial' }), null)).toBe('Abonnement ajouté (en essai)');
  });

  it('distingue l’annulation d’arrêt et la réactivation', () => {
    expect(eventLabel('status_change', JSON.stringify({ from: 'to_cancel', to: 'active' }), null)).toBe('Décision d’arrêt annulée');
    expect(eventLabel('status_change', JSON.stringify({ from: 'cancelled', to: 'active' }), null)).toBe('Abonnement réactivé');
    expect(eventLabel('status_change', JSON.stringify({ from: 'active', to: 'to_cancel' }), null)).toBe('Passé à résilier');
  });

  it('formate un changement de prix', () => {
    expect(eventLabel('price_change', JSON.stringify({ from: 999, to: 1299 }), null)).toBe(
      `Prix modifié : ${formatEuros(999)} → ${formatEuros(1299)}`,
    );
  });

  it('ajoute le montant d’un prélèvement inattendu s’il est connu', () => {
    expect(eventLabel('unexpected_charge', '{}', 500)).toBe(`Prélèvement inattendu de ${formatEuros(500)}`);
    expect(eventLabel('unexpected_charge', '{}', null)).toBe('Prélèvement inattendu');
  });

  it('reconnaît la nouvelle tentative du marchand', () => {
    expect(eventLabel('note', JSON.stringify({ kind: 'review_again' }), null)).toBe('Prélèvement échoué, le marchand va retenter');
    expect(eventLabel('note', '{}', null)).toBe('Note');
  });
});

describe('reminderLabel', () => {
  it('nomme le rappel selon son type', () => {
    expect(reminderLabel('trial_end')).toBe('Rappel de fin d’essai');
    expect(reminderLabel('cancel_end')).toBe('Rappel de résiliation');
  });
});
