import { fundedAmountCents } from '@abonnements/core';
import { dateLabel, fundingPreview, logoLabel, paymentLabel, periodicityLabel, stepMargin, suggestionSummary } from './form-labels';

describe('dateLabel', () => {
  it('nomme la date selon le statut', () => {
    expect(dateLabel('trial')).toBe('Fin d’essai');
    expect(dateLabel('cancelled')).toBe('Dernière échéance');
    expect(dateLabel('active')).toBe('Prochain prélèvement');
  });
});

describe('libellés de choix', () => {
  it('replie sur l’initiale sans logo connu', () => {
    expect(logoLabel(null)).toBe('Initiale du nom');
    expect(logoLabel('inconnu')).toBe('Initiale du nom');
  });

  it('nomme la périodicité et le moyen de paiement', () => {
    expect(periodicityLabel('quarter')).toBe('Trimestriel');
    expect(paymentLabel('other')).toBe('Autre');
  });
});

describe('suggestionSummary', () => {
  it('liste les compléments trouvés', () => {
    expect(suggestionSummary({ trialDays: 7, cancelUrl: 'https://x.fr' })).toBe('essai usuel 7 jours · lien de résiliation trouvé');
    expect(suggestionSummary({ trialDays: null, cancelUrl: null })).toBe('catégorie et logo');
  });
});

describe('stepMargin', () => {
  it('avance par demi-point, entre 0 et 5 %', () => {
    expect(stepMargin(300, 1)).toBe(350);
    expect(stepMargin(480, 1)).toBe(500);
    expect(stepMargin(30, -1)).toBe(0);
  });
});

describe('fundingPreview', () => {
  it('ne finance rien sans montant valide', () => {
    expect(fundingPreview('', 300, 'month')).toEqual({ funded: 0, monthly: null });
    expect(fundingPreview(',5', 300, 'month')).toEqual({ funded: 0, monthly: null });
  });

  it('ajoute la marge et provisionne un abonnement annuel', () => {
    const funded = fundedAmountCents(12000, 300);
    expect(fundingPreview('120', 300, 'month')).toEqual({ funded, monthly: null });
    expect(fundingPreview('120', 300, 'year')).toEqual({ funded, monthly: Math.ceil(funded / 12) });
  });
});
