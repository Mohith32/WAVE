import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_300Light, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '../utils/theme';
import { onNotificationTap, presentLocalNotification } from '../utils/notifications';
import { addMessageHandler } from '../utils/websocket';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

function Shell() {
  const theme = useTheme();
  const router = useRouter();

  // Tap a push/local notification → open the relevant chat
  useEffect(() => {
    const unsub = onNotificationTap((data) => {
      if (data?.type === 'dm' && data?.conversationWith) {
        router.push(`/(main)/chat/${data.conversationWith}`);
      } else if (data?.type === 'clan' && data?.groupId) {
        router.push(`/(main)/group-chat/${data.groupId}`);
      }
    });
    return unsub;
  }, [router]);

  // Foreground: if a WS message arrives while app is open, present a local banner
  // (this is what works in Expo Go, since real APNS/FCM don't deliver in Expo Go)
  useEffect(() => {
    const cache = new Map(); // senderId -> displayName
    const remove = addMessageHandler(async (msg) => {
      if (msg.type === 'message' && msg.data) {
        const senderId = msg.data.senderId;
        // Respect per-peer mute preference
        if (await storage.isMuted(senderId)) return;
        let name = cache.get(senderId);
        if (!name) {
          try {
            const u = await api.getUser(senderId);
            if (u?.success && u.data?.displayName) {
              name = u.data.displayName;
              cache.set(senderId, name);
            }
          } catch {}
        }
        presentLocalNotification({
          title: name || 'New message',
          body: msg.data.messageType === 'IMAGE' ? '📷 Photo' : msg.data.messageType === 'FILE' ? '📄 File' : 'New message',
          data: { type: 'dm', conversationWith: senderId },
        });
      } else if (msg.type === 'group_message' && msg.data) {
        presentLocalNotification({
          title: 'New clan message',
          body: msg.data.messageType === 'IMAGE' ? '📷 Photo' : 'New message',
          data: { type: 'clan', groupId: msg.data.groupId },
        });
      }
    });
    return () => remove();
  }, []);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} backgroundColor={theme.colors.headerBg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
