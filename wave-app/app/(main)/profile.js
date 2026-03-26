import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../utils/api';
import { disconnectWebSocket } from '../../utils/websocket';
import { theme, ghostBorder } from '../../utils/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const session = await storage.getSession();
    setUser(session);
  };

  const handleLogout = async () => {
    Alert.alert('DISCONNECT NODE', 'Terminate secure session and purge volatile keys?', [
      { text: 'CANCEL', style: 'cancel' },
      { 
        text: 'TERMINATE', 
        style: 'destructive',
        onPress: async () => {
          disconnectWebSocket();
          setAuthToken(null);
          await storage.clearSession();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  if (!user) return null;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>NODE STATUS</Text>
      </View>

      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user.displayName?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{user.displayName}</Text>
        <Text style={s.email}>{user.email}</Text>
        <View style={s.badge}>
          <Ionicons name="shield-checkmark" size={12} color={theme.colors.secondary} />
          <Text style={s.badgeText}>ENCRYPTED CONNECTION ACTIVE</Text>
        </View>
      </View>

      <View style={s.section}>
        <BlurView intensity={40} tint="dark" style={[s.menuContainer, ghostBorder]}>
          <TouchableOpacity style={s.menuItem}>
            <Ionicons name="key-outline" size={24} color={theme.colors.primary} />
            <Text style={s.menuText}>Cryptographic Keys</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textVariant} />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.menuItem}>
            <Ionicons name="hardware-chip-outline" size={24} color={theme.colors.primary} />
            <Text style={s.menuText}>Node Configuration</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textVariant} />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.menuItem}>
            <Ionicons name="color-palette-outline" size={24} color={theme.colors.primary} />
            <Text style={s.menuText}>Interface Paradigm</Text>
            <Text style={s.menuValue}>Void Mode</Text>
          </TouchableOpacity>
        </BlurView>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <BlurView intensity={20} tint="dark" style={[s.logoutContainer, ghostBorder]}>
          <Ionicons name="power-outline" size={20} color={theme.colors.error} />
          <Text style={s.logoutText}>TERMINATE CONNECTION</Text>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  title: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.xxl, 
    color: theme.colors.primary, 
    letterSpacing: 4 
  },
  profileCard: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 100, height: 100, borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceHigh,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    ...theme.elevation.ambientGlow,
  },
  avatarText: { color: theme.colors.primary, fontSize: 36, fontFamily: theme.typography.fontSemiBold },
  name: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.xxl, 
    color: theme.colors.primary, 
    marginBottom: 8,
    letterSpacing: 1 
  },
  email: { 
    fontFamily: theme.typography.fontLight, 
    fontSize: theme.fontSize.md, 
    color: theme.colors.textVariant, 
    marginBottom: 20, 
    letterSpacing: 0.5 
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surfaceLow,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.full,
  },
  badgeText: { color: theme.colors.secondary, fontSize: 10, fontFamily: theme.typography.fontSemiBold, letterSpacing: 1 },
  section: { marginTop: 12, paddingHorizontal: 20 },
  menuContainer: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceBase,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  menuText: { 
    flex: 1, color: theme.colors.text, 
    fontSize: theme.fontSize.md, fontFamily: theme.typography.fontRegular, 
    marginLeft: 16, letterSpacing: 0.5 
  },
  menuValue: { color: theme.colors.secondary, fontSize: 12, fontFamily: theme.typography.fontSemiBold, letterSpacing: 1, marginRight: 8 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceHighest, // Simulated line utilizing tonal transition instead
    marginHorizontal: 20,
  },
  logoutBtn: {
    marginTop: 40, marginHorizontal: 20, height: 56,
  },
  logoutContainer: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.xl, 
  },
  logoutText: { color: theme.colors.error, fontSize: 12, fontFamily: theme.typography.fontSemiBold, letterSpacing: 2 },
});
