import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../utils/api';
import { disconnectWebSocket } from '../../utils/websocket';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This will sign you out and clear all local data. Server-side deletion is not yet implemented — contact support to fully remove your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out + clear',
          style: 'destructive',
          onPress: async () => {
            disconnectWebSocket();
            setAuthToken(null);
            await storage.clearSession();
            await storage.clearKeyPair();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const items = [
    {
      icon: 'shield-checkmark',
      color: theme.colors.success,
      title: 'End-to-end encryption',
      sub: 'Messages are encrypted on-device. Active by default.',
    },
    {
      icon: 'lock-closed',
      color: theme.colors.primary,
      title: 'Secure storage',
      sub: 'Tokens and keys stored in OS keychain.',
    },
    {
      icon: 'eye-off',
      color: '#8B5CF6',
      title: 'No analytics',
      sub: 'Wave does not track your activity.',
    },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.sectionLabel}>HOW WE PROTECT YOU</Text>
        <View style={s.section}>
          {items.map((it, idx) => (
            <View key={it.title}>
              <View style={s.row}>
                <View style={[s.rowIconBox, { backgroundColor: it.color + '22' }]}>
                  <Ionicons name={it.icon} size={20} color={it.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{it.title}</Text>
                  <Text style={s.rowSub}>{it.sub}</Text>
                </View>
              </View>
              {idx < items.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>ACTIONS</Text>
        <View style={s.section}>
          <TouchableOpacity style={s.row} onPress={() => router.push('/(main)/settings-keys')}>
            <View style={[s.rowIconBox, { backgroundColor: theme.colors.primary + '22' }]}>
              <Ionicons name="key" size={20} color={theme.colors.primary} />
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>Manage encryption keys</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.row} onPress={handleDeleteAccount}>
            <View style={[s.rowIconBox, { backgroundColor: theme.colors.error + '22' }]}>
              <Ionicons name="trash" size={20} color={theme.colors.error} />
            </View>
            <Text style={[s.rowLabel, { flex: 1, color: theme.colors.error }]}>
              Delete account + keys
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  headerTitle: { fontFamily: t.typography.fontSemiBold, fontSize: t.fontSize.lg, color: t.colors.text },

  sectionLabel: {
    fontFamily: t.typography.fontMedium, fontSize: t.fontSize.xs,
    color: t.colors.textMuted, marginTop: 20, marginBottom: 6,
    marginHorizontal: 20, letterSpacing: 0.5,
  },
  section: {
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
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.md, color: t.colors.text },
  rowSub: { fontFamily: t.typography.fontRegular, fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
  divider: { height: 0.5, marginLeft: 64, backgroundColor: t.colors.borderLight },
});
