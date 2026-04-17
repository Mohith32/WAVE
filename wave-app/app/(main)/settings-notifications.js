import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';
import { storage } from '../../utils/storage';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [prefs, setPrefs] = useState({ push: true, sound: true, vibration: true });

  useEffect(() => {
    storage.getNotifPreferences().then(setPrefs).catch(() => {});
  }, []);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    storage.setNotifPreferences(next).catch(() => {});
  };

  const rows = [
    {
      key: 'push',
      icon: 'notifications',
      label: 'Push notifications',
      sub: 'Alerts when you get new messages',
    },
    {
      key: 'sound',
      icon: 'volume-high',
      label: 'Sound',
      sub: 'Play a sound for new messages',
    },
    {
      key: 'vibration',
      icon: 'phone-portrait',
      label: 'Vibration',
      sub: 'Vibrate for new messages',
    },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
        <View style={s.section}>
          {rows.map((r, idx) => (
            <View key={r.key}>
              <View style={s.row}>
                <View style={s.rowIconBox}>
                  <Ionicons name={r.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{r.label}</Text>
                  <Text style={s.rowSub}>{r.sub}</Text>
                </View>
                <Switch
                  value={!!prefs[r.key]}
                  onValueChange={(v) => update(r.key, v)}
                  trackColor={{ false: theme.colors.borderLight, true: theme.colors.primary + '88' }}
                  thumbColor={prefs[r.key] ? theme.colors.primary : theme.colors.surface}
                />
              </View>
              {idx < rows.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        <Text style={s.note}>
          Push notifications require a native build. In Expo Go, only in-app alerts are shown.
        </Text>
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
    backgroundColor: t.colors.primary + '22',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.md, color: t.colors.text },
  rowSub: { fontFamily: t.typography.fontRegular, fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
  divider: { height: 0.5, marginLeft: 64, backgroundColor: t.colors.borderLight },
  note: {
    marginTop: 16, paddingHorizontal: 20,
    fontFamily: t.typography.fontRegular, fontSize: 12,
    color: t.colors.textMuted, textAlign: 'center',
  },
});
