import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { type ReactNode, useMemo } from 'react';
import { useColors } from '@/theme/use-colors';
import { useScheme } from '@/theme/use-scheme';

/**
 * Thème de la navigation : le fond des scènes (visible pendant une transition de pile ou d'onglet) prend la couleur
 * de fond de l'app, sinon un éclair clair apparaît en thème sombre.
 */
export function NavigationTheme({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const colors = useColors();
  const theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primaryText,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}
