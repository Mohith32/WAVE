import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_300Light, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { storage } from '../utils/storage';
import { setAuthToken } from '../utils/api';
import { connectWebSocket } from '../utils/websocket';
import { theme } from '../utils/theme';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  let [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;

    // Check auth only on app load to decide initial screen
    const inAuthGroup = segments[0] === '(auth)' || !segments[0];

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(main)/chats');
    }
  }, [isReady, fontsLoaded]);

  const checkAuth = async () => {
    const session = await storage.getSession();
    if (session) {
      setAuthToken(session.token);
      connectWebSocket(session.token);
      setIsLoggedIn(true);
    }
    setIsReady(true);
  };

  if (!isReady || !fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}
