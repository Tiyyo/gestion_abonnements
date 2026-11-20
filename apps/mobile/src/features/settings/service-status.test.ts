import { aiSuggestionStatus, reconcileStatus, remindersStatus, revolutStatus } from './service-status';

describe('revolutStatus', () => {
  it('affiche la date de fin de l’accord', () => {
    expect(revolutStatus('2027-05-17')).toEqual({ state: 'ok', status: 'accord jusqu’au 17\u00a0mai\u00a02027' });
  });

  it('signale des soldes indisponibles sans accord', () => {
    expect(revolutStatus(undefined)).toEqual({ state: 'off', status: 'soldes indisponibles' });
  });

  it('demande le renouvellement d’un accord expiré ou proche de sa fin', () => {
    expect(revolutStatus(undefined, true)).toEqual({ state: 'warn', status: 'accord expiré, à renouveler' });
    expect(revolutStatus('2027-05-17', false, '2027-05-03')).toEqual({
      state: 'warn',
      status: 'à renouveler avant le 17\u00a0mai\u00a02027',
    });
    expect(revolutStatus('2027-05-17', false, '2027-05-02')).toEqual({ state: 'ok', status: 'accord jusqu’au 17\u00a0mai\u00a02027' });
  });
});

describe('remindersStatus', () => {
  it('indique des rappels coupés, quelle que soit l’autorisation', () => {
    expect(remindersStatus(false, false)).toEqual({ state: 'off', status: 'coupés' });
  });

  it('alerte quand Android refuse les notifications', () => {
    expect(remindersStatus(true, false)).toEqual({ state: 'warn', status: 'autorisation Android requise' });
  });

  it('considère les rappels activés tant que l’autorisation n’est pas lue', () => {
    expect(remindersStatus(true, null)).toEqual({ state: 'ok', status: 'activés' });
    expect(remindersStatus(true, true)).toEqual({ state: 'ok', status: 'activés' });
  });
});

describe('reconcileStatus', () => {
  it('indique un service non inclus ou coupé', () => {
    expect(reconcileStatus(false, true, null)).toEqual({ state: 'off', status: 'non inclus' });
    expect(reconcileStatus(true, false, '2026-11-20')).toEqual({ state: 'off', status: 'coupé' });
  });

  it('donne le jour de la dernière lecture du compte', () => {
    expect(reconcileStatus(true, true, null)).toEqual({ state: 'off', status: 'pas encore relu' });
    expect(reconcileStatus(true, true, '2026-11-20')).toEqual({ state: 'ok', status: 'compte relu le 20\u00a0nov.' });
  });
});

describe('aiSuggestionStatus', () => {
  it('indique un service non inclus dans la version', () => {
    expect(aiSuggestionStatus(false, false)).toEqual({ state: 'off', status: 'non incluse' });
  });

  it('suit l’interrupteur quand le service est inclus', () => {
    expect(aiSuggestionStatus(true, true)).toEqual({ state: 'ok', status: 'active' });
    expect(aiSuggestionStatus(true, false)).toEqual({ state: 'off', status: 'coupée' });
  });
});
