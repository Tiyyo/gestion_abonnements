import { interpretResponse, MARK_DONE_ACTION, responseKey } from './response';

const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

describe('responseKey', () => {
  it('distingue la notification et le bouton touché', () => {
    expect(responseKey('n1', MARK_DONE_ACTION)).toBe('n1|mark-done');
    expect(responseKey('n1', DEFAULT_ACTION)).not.toBe(responseKey('n1', MARK_DONE_ACTION));
    expect(responseKey('n2', MARK_DONE_ACTION)).not.toBe(responseKey('n1', MARK_DONE_ACTION));
  });
});

describe('interpretResponse', () => {
  it('ouvre l’écran d’une ancienne notification, sans action', () => {
    expect(interpretResponse({ requestId: 'n1', actionId: DEFAULT_ACTION, data: { url: '/plan' } })).toEqual({
      key: `n1|${DEFAULT_ACTION}`,
      url: '/plan',
      markDoneTransferId: null,
    });
  });

  it('marque le transfert fait quand le bouton est touché', () => {
    const intent = interpretResponse({ requestId: 'n1', actionId: MARK_DONE_ACTION, data: { url: '/', transferId: 't1' } });
    expect(intent).toMatchObject({ url: '/', markDoneTransferId: 't1' });
  });

  it('ne marque rien pour un simple toucher sur un rappel de transfert', () => {
    const intent = interpretResponse({ requestId: 'n1', actionId: DEFAULT_ACTION, data: { url: '/', transferId: 't1' } });
    expect(intent.markDoneTransferId).toBeNull();
  });

  it('ignore le bouton si la notification ne désigne aucun transfert', () => {
    expect(interpretResponse({ requestId: 'n1', actionId: MARK_DONE_ACTION, data: { url: '/' } }).markDoneTransferId).toBeNull();
  });

  it('tolère des données absentes ou mal formées', () => {
    expect(interpretResponse({ requestId: 'n1', actionId: DEFAULT_ACTION, data: undefined })).toMatchObject({ url: null });
    expect(interpretResponse({ requestId: 'n1', actionId: MARK_DONE_ACTION, data: { url: 3, transferId: '' } })).toMatchObject({
      url: null,
      markDoneTransferId: null,
    });
  });
});
