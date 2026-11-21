/** Options des routes de la pile racine (cf. CLAUDE.md : modales sans geste de fermeture, pour ne pas perdre une saisie). */
export const STACK_OPTIONS = { headerShown: false, animation: 'ios_from_right' } as const;

// Feuille du bas (ui/surfaces/sheet-screen) : l'écran précédent reste visible derrière ; la feuille glisse elle-même, la route ne fait qu'un fondu.
export const SHEET = { presentation: 'transparentModal', animation: 'fade', gestureEnabled: false } as const;
