import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export const AndroidSetting = IntentLauncher.ActivityAction;

/** Les alarmes exactes demandent une autorisation à partir d'Android 12 (API 31). */
export const EXACT_ALARM_RELEVANT = Platform.OS === 'android' && Number(Platform.Version) >= 31;

/** Ouvre un écran des réglages Android (celui de l'app si `withPackage`), à défaut les réglages de l'app. */
export function openAndroidSetting(action: IntentLauncher.ActivityAction, withPackage = false): Promise<unknown> {
  const packageName = Constants.expoConfig?.android?.package ?? 'host.exp.exponent';
  return IntentLauncher.startActivityAsync(action, withPackage ? { data: `package:${packageName}` } : undefined).catch(() =>
    Linking.openSettings(),
  );
}
