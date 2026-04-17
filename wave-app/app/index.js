import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../utils/storage';
import { setAuthToken } from '../utils/api';
import { connectWebSocket } from '../utils/websocket';
import { registerForPushNotifications } from '../utils/notifications';
import { useTheme } from '../utils/theme';

// Splash screen stays visible until this route renders + we navigate away.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const session = await storage.getSession();
        if (session?.token) {
          setAuthToken(session.token);
          connectWebSocket(session.token);
          registerForPushNotifications();
          router.replace('/(main)/chats');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (e) {
        console.warn('Session check failed', e);
        router.replace('/(auth)/login');
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.logoBox, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="paper-plane" size={44} color="#FFFFFF" />
      </View>
      <Text style={[styles.text, { color: theme.colors.text }]}>Wave</Text>
      <ActivityIndicator color={theme.colors.primary} size="small" style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoBox: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  text: { fontSize: 28, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
});
