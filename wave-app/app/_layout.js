import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_300Light, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { storage } from '../utils/storage';
import { setAuthToken } from '../utils/api';
import { connectWebSocket } from '../utils/websocket';
import { ThemeProvider, useTheme } from '../utils/theme';

function RootNav() {
  const theme = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === '(auth)' || !segments[0];
    if (!isLoggedIn && !inAuthGroup) router.replace('/(auth)/login');
    else if (isLoggedIn && inAuthGroup) router.replace('/(main)/chats');
  }, [isReady, segments.join('/')]);

  const checkAuth = async () => {
    const session = await storage.getSession();
    if (session) {
      setAuthToken(session.token);
      connectWebSocket(session.token);
      setIsLoggedIn(true);
    }
    setIsReady(true);
  };

  if (!isReady) return null;

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} backgroundColor={theme.colors.headerBg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  if (!fontsLoaded) return null;
  return (
    <ThemeProvider>
      <RootNav />
    </ThemeProvider>
  );
}
