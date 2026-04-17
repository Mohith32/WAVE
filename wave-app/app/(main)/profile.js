import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, useColorScheme, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../utils/api';
import { disconnectWebSocket } from '../../utils/websocket';
import { useTheme } from '../../utils/theme';
import { getAvatarColor } from '../../components/Avatar';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = useColorScheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [user, setUser] = useState(null);

  useEffect(() => { loadProfile(); }, []);
  const loadProfile = async () => setUser(await storage.getSession());

  const handleLogout = () => {
    Alert.alert('Log out?', "You'll need to sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          disconnectWebSocket();
          setAuthToken(null);
          await storage.clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) return null;

  const initial = user.displayName?.charAt(0).toUpperCase() || '?';
  const bg = getAvatarColor(user.displayName);
  const themeLabel = theme.preference === 'system'
    ? (scheme === 'dark' ? 'Automatic · Dark' : 'Automatic · Light')
    : theme.preference.charAt(0).toUpperCase() + theme.preference.slice(1);

  const rows = [
    { icon: 'key-outline', label: 'Encryption Keys', color: theme.colors.primary, onPress: () => router.push('/(main)/settings-keys') },
    { icon: 'notifications-outline', label: 'Notifications', color: theme.colors.error, onPress: () => router.push('/(main)/settings-notifications') },
    { icon: 'contrast-outline', label: 'Appearance', value: themeLabel, color: theme.colors.primary, onPress: () => router.push('/(main)/settings-theme') },
    { icon: 'lock-closed-outline', label: 'Privacy & Security', color: theme.colors.success, onPress: () => router.push('/(main)/settings-privacy') },
    { icon: 'information-circle-outline', label: 'About', color: theme.colors.textMuted, onPress: () => router.push('/(main)/settings-about') },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Profile card */}
        <Pressable style={({ pressed }) => [s.profileCard, pressed && s.pressed]}>
          <View style={[s.avatar, { backgroundColor: bg }]}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.profileName} numberOfLines={1}>{user.displayName}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{user.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textGhost} />
        </Pressable>

        {/* Settings rows */}
        <View style={s.section}>
          {rows.map((r, idx) => (
            <View key={r.label}>
              <Pressable
                onPress={r.onPress}
                style={({ pressed }) => [s.row, pressed && s.pressed]}
              >
                <View style={[s.iconBox, { backgroundColor: r.color + '22' }]}>
                  <Ionicons name={r.icon} size={18} color={r.color} />
                </View>
                <Text style={s.rowLabel}>{r.label}</Text>
                {r.value ? <Text style={s.rowValue}>{r.value}</Text> : null}
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textGhost} style={{ marginLeft: 6 }} />
              </Pressable>
              {idx < rows.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        {/* Logout */}
        <View style={[s.section, { marginTop: 24 }]}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [s.row, s.rowCenter, pressed && s.pressed]}
          >
            <Text style={s.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        <Text style={s.footer}>Wave · End-to-end encrypted</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },

  header: {
    backgroundColor: t.colors.background,
    paddingHorizontal: 20, paddingBottom: 10,
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 34, color: t.colors.text, letterSpacing: -0.5,
  },

  scroll: { padding: 16, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: 12, padding: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: t.typography.fontSemiBold },
  profileName: { fontFamily: t.typography.fontSemiBold, fontSize: 20, color: t.colors.text, letterSpacing: -0.3 },
  profileEmail: { fontFamily: t.typography.fontRegular, fontSize: 13, color: t.colors.textMuted, marginTop: 2 },

  section: {
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: t.colors.surface,
  },
  rowCenter: { justifyContent: 'center' },
  iconBox: {
    width: 30, height: 30, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rowLabel: { flex: 1, fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.text },
  rowValue: { fontFamily: t.typography.fontRegular, fontSize: 15, color: t.colors.textMuted },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56, backgroundColor: t.colors.hairline,
  },

  logoutText: { color: t.colors.error, fontSize: 17, fontFamily: t.typography.fontRegular },

  footer: {
    marginTop: 24, textAlign: 'center',
    fontFamily: t.typography.fontRegular, fontSize: 12,
    color: t.colors.textMuted,
  },
});
