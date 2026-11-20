import * as Haptics from 'expo-haptics';

const quiet = (promise: Promise<void>) => {
  promise.catch(() => undefined);
};

export const haptic = {
  select: () => quiet(Haptics.selectionAsync()),
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
