import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Thin wrapper so screens don't need to import expo-haptics everywhere.
// Fails silently if the device doesn't support haptics (iOS emulators, web).
const safe = (fn) => {
  try { fn(); } catch {}
};

export const hap = {
  light:   () => safe(() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium:  () => safe(() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy:   () => safe(() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  select:  () => safe(() => Platform.OS !== 'web' && Haptics.selectionAsync()),
  success: () => safe(() => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error:   () => safe(() => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
