import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications';
import { ensureChannel } from './channel';

export async function notificationsAllowed(): Promise<boolean> {
  const { granted } = await getPermissionsAsync();
  return granted;
}

export async function requestNotifications(): Promise<boolean> {
  await ensureChannel();
  const current = await getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  return (await requestPermissionsAsync()).granted;
}
