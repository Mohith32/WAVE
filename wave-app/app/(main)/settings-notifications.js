import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import BlurHeader from '../../components/BlurHeader';
import { useTheme } from '../../utils/theme';
import { storage } from '../../utils/storage';

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [prefs, setPrefs] = useState({ push: true, sound: true, vibration: true });

  useEffect(() => { storage.getNotifPreferences().then(setPrefs).catch(() => {}); }, []);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    storage.setNotifPreferences(next).catch(() => {});
  };

  const rows = [
    { key: 'push',      label: 'Allow notifications' },
    { key: 'sound',     label: 'Sounds' },
    { key: 'vibration', label: 'Vibration' },
  ];

  return (
    <View style={s.container}>
      <BlurHeader title="Notifications" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={s.section}>
          {rows.map((r, idx) => (
            <View key={r.key}>
              <View style={s.row}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <Switch
                  value={!!prefs[r.key]}
                  onValueChange={(v) => update(r.key, v)}
                  trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.success }}
                  thumbColor="#fff"
                  ios_backgroundColor={theme.colors.surfaceMuted}
                />
              </View>
              {idx < rows.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>
        <Text style={s.footnote}>
          True background push requires a dev build. In Expo Go, you'll see in-app banners.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: 12, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    minHeight: 44,
  },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.text },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },
  footnote: {
    fontFamily: t.typography.fontRegular, fontSize: 13,
    color: t.colors.textMuted, marginTop: 10, marginHorizontal: 12, lineHeight: 18,
  },
});
