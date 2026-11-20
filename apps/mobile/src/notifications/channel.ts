import { AndroidImportance, setNotificationChannelAsync } from 'expo-notifications';
import { Platform } from 'react-native';

export const CHANNEL_ID = 'rappels';

export async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels',
      importance: AndroidImportance.HIGH,
    });
  }
}
