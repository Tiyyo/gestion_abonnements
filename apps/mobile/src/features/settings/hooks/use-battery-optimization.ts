import * as Battery from 'expo-battery';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useOnAppActive } from './use-on-app-active';

/** Relu au retour des réglages Android : la carte batterie disparaît dès que l'optimisation est coupée. */
export function useBatteryOptimization(): boolean {
  const [optimized, setOptimized] = useState(false);
  useOnAppActive(
    useCallback(() => {
      if (Platform.OS === 'android') {
        Battery.isBatteryOptimizationEnabledAsync()
          .then(setOptimized)
          .catch(() => setOptimized(false));
      }
    }, []),
  );
  return optimized;
}
