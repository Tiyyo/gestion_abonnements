import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';
import type { Scheme } from './palette';
import { getThemeMode, subscribeThemeMode } from './theme-mode';

/** Thème à donner au fournisseur Tamagui : le réglage « Apparence » s'il force un thème, sinon celui du système. */
export function useAppScheme(): Scheme {
  const system = useColorScheme();
  const mode = useSyncExternalStore(subscribeThemeMode, getThemeMode);
  if (mode !== 'system') {
    return mode;
  }
  return system === 'dark' ? 'dark' : 'light';
}
