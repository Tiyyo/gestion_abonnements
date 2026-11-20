import * as LocalAuthentication from 'expo-local-authentication';

export async function biometricAvailable(): Promise<boolean> {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Annuler' });
  return result.success;
}
