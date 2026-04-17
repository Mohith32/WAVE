import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN: 'wave_auth_token',
  USER_ID: 'wave_user_id',
  EMAIL: 'wave_user_email',
  DISPLAY_NAME: 'wave_display_name',
  PRIVATE_KEY: 'wave_private_key',
  PUBLIC_KEY: 'wave_public_key',
  THEME_PREF: 'wave_theme_preference',
  NOTIF_PREF: 'wave_notif_preferences',
};

export const storage = {
  saveSession: async ({ token, userId, email, displayName }) => {
    await SecureStore.setItemAsync(KEYS.TOKEN, token);
    await SecureStore.setItemAsync(KEYS.USER_ID, userId);
    await SecureStore.setItemAsync(KEYS.EMAIL, email);
    await SecureStore.setItemAsync(KEYS.DISPLAY_NAME, displayName);
  },

  getSession: async () => {
    const token = await SecureStore.getItemAsync(KEYS.TOKEN);
    const userId = await SecureStore.getItemAsync(KEYS.USER_ID);
    const email = await SecureStore.getItemAsync(KEYS.EMAIL);
    const displayName = await SecureStore.getItemAsync(KEYS.DISPLAY_NAME);
    if (!token) return null;
    return { token, userId, email, displayName };
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER_ID);
    await SecureStore.deleteItemAsync(KEYS.EMAIL);
    await SecureStore.deleteItemAsync(KEYS.DISPLAY_NAME);
  },

  saveKeyPair: async ({ publicKey, privateKey }) => {
    await SecureStore.setItemAsync(KEYS.PUBLIC_KEY, publicKey);
    await SecureStore.setItemAsync(KEYS.PRIVATE_KEY, privateKey);
  },

  getKeyPair: async () => {
    const publicKey = await SecureStore.getItemAsync(KEYS.PUBLIC_KEY);
    const privateKey = await SecureStore.getItemAsync(KEYS.PRIVATE_KEY);
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey };
  },

  clearKeyPair: async () => {
    await SecureStore.deleteItemAsync(KEYS.PUBLIC_KEY);
    await SecureStore.deleteItemAsync(KEYS.PRIVATE_KEY);
  },

  // Theme: 'system' | 'light' | 'dark'
  getThemePreference: async () => {
    return (await SecureStore.getItemAsync(KEYS.THEME_PREF)) || 'system';
  },
  setThemePreference: async (pref) => {
    await SecureStore.setItemAsync(KEYS.THEME_PREF, pref);
  },

  // Notifications: { push, sound, vibration }
  getNotifPreferences: async () => {
    const raw = await SecureStore.getItemAsync(KEYS.NOTIF_PREF);
    if (!raw) return { push: true, sound: true, vibration: true };
    try { return JSON.parse(raw); } catch { return { push: true, sound: true, vibration: true }; }
  },
  setNotifPreferences: async (prefs) => {
    await SecureStore.setItemAsync(KEYS.NOTIF_PREF, JSON.stringify(prefs));
  },
};
