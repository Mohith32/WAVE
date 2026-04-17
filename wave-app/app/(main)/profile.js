import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../utils/api';
import { disconnectWebSocket } from '../../utils/websocket';
import { useTheme } from '../../utils/theme';
import { getAvatarColor } from '../../components/Avatar';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = useColorScheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [user, setUser] = useState(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const session = await storage.getSession();
    setUser(session);
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
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

  const rows = [
    { icon: 'key-outline', label: 'Encryption Keys', color: theme.colors.primary },
    { icon: 'notifications-outline', label: 'Notifications', color: '#F59E0B' },
    {
      icon: scheme === 'dark' ? 'moon' : 'sunny',
      label: 'Theme',
      color: '#EC4899',
      value: scheme === 'dark' ? 'Dark' : 'Light',
    },
    { icon: 'lock-closed-outline', label: 'Privacy & Security', color: theme.colors.success },
    { icon: 'information-circle-outline', label: 'About Wave', color: theme.colors.textSecondary },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <View style={s.profileCard}>
        <View style={[s.avatar, { backgroundColor: bg }]}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.name}>{user.displayName}</Text>
        <Text style={s.email}>{user.email}</Text>
      </View>

      <View style={s.section}>
        {rows.map((r, idx) => (
          <View key={r.label}>
            <TouchableOpacity style={s.row} activeOpacity={0.6}>
              <View style={[s.rowIconBox, { backgroundColor: r.color + '22' }]}>
                <Ionicons name={r.icon} size={20} color={r.color} />
              </View>
              <Text style={s.rowLabel}>{r.label}</Text>
              {r.value ? <Text style={s.rowValue}>{r.value}</Text> : null}
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
            {idx < rows.length - 1 && <View style={s.divider} />}
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={s.version}>Wave · v1.0.0</Text>
    </ScrollView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  headerTitle: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.xxl, color: t.colors.text,
  },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: t.colors.surface,
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 40, fontFamily: t.typography.fontSemiBold },
  name: { fontFamily: t.typography.fontSemiBold, fontSize: t.fontSize.xl, color: t.colors.text },
  email: {
    fontFamily: t.typography.fontRegular, fontSize: t.fontSize.sm,
    color: t.colors.textMuted, marginTop: 4,
  },

  section: {
    marginTop: 16,
    backgroundColor: t.colors.surface,
    borderTopWidth: 0.5, borderBottomWidth: 0.5,
    borderColor: t.colors.headerBorder,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  rowIconBox: {
    width: 34, height: 34, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  rowLabel: { flex: 1, fontFamily: t.typography.fontRegular, fontSize: t.fontSize.md, color: t.colors.text },
  rowValue: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.sm, color: t.colors.textMuted, marginRight: 6 },
  divider: { height: 0.5, marginLeft: 64, backgroundColor: t.colors.borderLight },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: t.colors.surface,
    borderTopWidth: 0.5, borderBottomWidth: 0.5,
    borderColor: t.colors.headerBorder,
  },
  logoutText: { color: t.colors.error, fontSize: t.fontSize.md, fontFamily: t.typography.fontSemiBold },

  version: {
    marginTop: 28, textAlign: 'center',
    fontFamily: t.typography.fontRegular, fontSize: 12,
    color: t.colors.textMuted,
  },
});
