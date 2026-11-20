import { TOAST_ACTION_MS, TOAST_MS, TOAST_SCREEN_READER_MS, type Toast, toastBottom, toastDuration, toastReducer } from './toast-logic';

const toast = (id: number, withAction = false): Toast => ({
  id,
  message: `message ${id}`,
  tone: 'ok',
  action: withAction ? { label: 'Annuler', onPress: () => undefined } : undefined,
});

describe('toastReducer', () => {
  it('affiche un message', () => {
    expect(toastReducer(null, { type: 'show', toast: toast(1) })).toMatchObject({ id: 1 });
  });

  it('un nouveau message remplace le précédent', () => {
    const first = toastReducer(null, { type: 'show', toast: toast(1, true) });
    expect(toastReducer(first, { type: 'show', toast: toast(2) })).toMatchObject({ id: 2, action: undefined });
  });

  it('la minuterie d’un message remplacé ne ferme pas le suivant', () => {
    const second = toastReducer(toast(1), { type: 'show', toast: toast(2) });
    expect(toastReducer(second, { type: 'dismiss', id: 1 })).toMatchObject({ id: 2 });
    expect(toastReducer(second, { type: 'dismiss', id: 2 })).toBeNull();
  });

  it('fermer sans message affiché ne fait rien, vider ferme tout', () => {
    expect(toastReducer(null, { type: 'dismiss', id: 3 })).toBeNull();
    expect(toastReducer(toast(4), { type: 'clear' })).toBeNull();
  });
});

describe('toastDuration', () => {
  it('reste environ 5 s sans action, plus longtemps avec', () => {
    expect(toastDuration(toast(1), false)).toBe(TOAST_MS);
    expect(toastDuration(toast(1, true), false)).toBe(TOAST_ACTION_MS);
    expect(TOAST_ACTION_MS).toBeGreaterThan(TOAST_MS);
  });

  it('laisse le temps d’atteindre l’action avec un lecteur d’écran', () => {
    expect(toastDuration(toast(1, true), true)).toBe(TOAST_SCREEN_READER_MS);
    expect(toastDuration(toast(1), true)).toBe(TOAST_MS);
  });
});

describe('toastBottom', () => {
  it('se place au-dessus de la barre d’onglets sans clavier', () => {
    expect(toastBottom({ hostHeight: 800, keyboardTop: null, restingOffset: 112 })).toBe(112);
  });

  it('se place juste au-dessus du clavier quand il recouvre la fenêtre', () => {
    expect(toastBottom({ hostHeight: 800, keyboardTop: 500, restingOffset: 112 })).toBe(312);
  });

  it('ne compte pas le clavier deux fois quand la fenêtre a été redimensionnée', () => {
    expect(toastBottom({ hostHeight: 500, keyboardTop: 500, restingOffset: 112 })).toBe(12);
    expect(toastBottom({ hostHeight: 480, keyboardTop: 500, restingOffset: 112 })).toBe(12);
  });

  it('garde la position de repos tant que l’hôte n’est pas mesuré', () => {
    expect(toastBottom({ hostHeight: 0, keyboardTop: 500, restingOffset: 112 })).toBe(112);
  });
});
