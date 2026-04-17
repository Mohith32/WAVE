import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from './api';
import { storage } from './storage';

// Show notification banner even when the app is in foreground.
// We check per-notification whether to actually display via setNotificationHandler below.
let currentChatPeerId = null;
export function setActiveChatPeer(peerId) { currentChatPeerId = peerId; }

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // If user is currently viewing the chat for that sender, don't show a banner
    const data = notification?.request?.content?.data || {};
    const senderFromData = data?.conversationWith || data?.senderId;
    const suppress = senderFromData && senderFromData === currentChatPeerId;
    return {
      shouldShowBanner: !suppress,
      shouldShowList: true,
      shouldPlaySound: !suppress,
      shouldSetBadge: false,
      // Legacy fields for older expo-notifications:
      shouldShowAlert: !suppress,
    };
  },
});

/**
 * Request permission and fetch the Expo push token, then send it to the backend.
 * Returns the token (or null if unsupported / denied).
 */
export async function registerForPushNotifications() {
  try {
    // Expo Go doesn't support real push in SDK 53+ — skip gracefully.
    if (Constants.appOwnership === 'expo') {
      return null;
    }
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3390EC',
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenRes?.data;

    if (token) await api.updatePushToken(token);
    return token;
  } catch (e) {
    console.warn('registerForPushNotifications failed', e?.message);
    return null;
  }
}

/**
 * Subscribe to notification taps — navigate to the relevant chat.
 * Returns unsubscribe function.
 */
export function onNotificationTap(handler) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    handler(data);
  });
  return () => sub.remove();
}

/**
 * Present a LOCAL notification immediately. Used as the foreground fallback
 * when a message arrives via WS while the app is open but the user is
 * elsewhere in the app. Works in Expo Go.
 */
export async function presentLocalNotification({ title, body, data }) {
  try {
    // Don't show if user is in that very chat
    if (data?.conversationWith && data.conversationWith === currentChatPeerId) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: title || 'New message', body: body || '', data: data || {} },
      trigger: null,
    });
  } catch {}
}

// Ignore-store — to avoid pestering user every app boot after they deny
const NOTIF_PROMPTED_KEY = 'wave_notif_asked';
export async function markNotificationPromptShown() {
  try { await storage?.setNotifPreferences?.({ askedOnce: true }); } catch {}
}
