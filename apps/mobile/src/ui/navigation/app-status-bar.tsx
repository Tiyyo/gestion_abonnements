import { StatusBar } from 'expo-status-bar';
import { useScheme } from '@/theme/use-scheme';

/**
 * Barre d'état accordée au thème : icônes sombres sur le fond clair, claires sur le fond sombre.
 * `onDark` : l'écran place un fond sombre sous la barre dans les deux thèmes (dégradé du Hero, voile d'une feuille).
 */
export function AppStatusBar({ onDark }: { onDark?: boolean }) {
  const scheme = useScheme();
  return <StatusBar style={onDark || scheme === 'dark' ? 'light' : 'dark'} />;
}
