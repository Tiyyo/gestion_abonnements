import { Appearance } from 'react-native';
import type { ThemeMode } from '@/db/types';

// Réglage « Apparence » en cours. Il vit hors de React : le fournisseur Tamagui est monté avant la base,
// donc avant de connaître le réglage (jusque-là, l'app suit le système).
let current: ThemeMode = 'system';
const listeners = new Set<() => void>();

export function getThemeMode(): ThemeMode {
  return current;
}

export function subscribeThemeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Applique le réglage : le thème Tamagui suit aussitôt (`useAppScheme`), et le mode nuit d'Android est forcé du même coup
 * pour que les fenêtres natives (sélecteurs de date et d'heure, invite biométrique) prennent le même thème.
 */
export function applyThemeMode(mode: ThemeMode): void {
  if (mode === current) {
    return;
  }
  current = mode;
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  listeners.forEach((listener) => listener());
}
