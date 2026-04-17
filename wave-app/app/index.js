import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { setAuthToken } from '../utils/api';
import { connectWebSocket } from '../utils/websocket';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

export default function Index() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    try {
      const session = await storage.getSession();
      if (session && session.token) {
        setAuthToken(session.token);
        connectWebSocket(session.token);
        router.replace('/(main)/chats');
      } else {
        router.replace('/(auth)/login');
      }
    } catch (e) {
      router.replace('/(auth)/login');
    } finally {
      setLoading(false);
    }
  };

  if (!loading) return null;

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
