import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';

const APP_VERSION = '1.0.0';
const GITHUB_URL = 'https://github.com/Mohith32/WAVE';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const open = (url) => Linking.openURL(url).catch(() => {});

  const links = [
    {
      icon: 'logo-github', color: theme.colors.text,
      label: 'Source code', sub: 'GitHub repository',
      onPress: () => open(GITHUB_URL),
    },
    {
      icon: 'document-text', color: theme.colors.primary,
      label: 'Terms of Service', sub: 'How you agree to use Wave',
      onPress: () => {},
    },
    {
      icon: 'shield-checkmark', color: theme.colors.success,
      label: 'Privacy Policy', sub: 'What we do (and don\'t do) with data',
      onPress: () => {},
    },
    {
      icon: 'heart', color: '#EC4899',
      label: 'Credits', sub: 'Built with Spring Boot + Expo',
      onPress: () => {},
    },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About Wave</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.hero}>
          <View style={s.logoBox}>
            <Ionicons name="paper-plane" size={48} color="#FFFFFF" />
          </View>
          <Text style={s.appName}>Wave</Text>
          <Text style={s.tagline}>Secure, encrypted messaging</Text>
          <Text style={s.version}>Version {APP_VERSION}</Text>
        </View>

        <View style={s.section}>
          {links.map((r, idx) => (
            <View key={r.label}>
              <TouchableOpacity style={s.row} onPress={r.onPress} activeOpacity={0.6}>
                <View style={[s.rowIconBox, { backgroundColor: r.color + '22' }]}>
                  <Ionicons name={r.icon} size={20} color={r.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{r.label}</Text>
                  <Text style={s.rowSub}>{r.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {idx < links.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        <Text style={s.footer}>Made with 💙 · Open source</Text>
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

  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  logoBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  appName: { fontFamily: t.typography.fontSemiBold, fontSize: 26, color: t.colors.text },
  tagline: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.sm, color: t.colors.textSecondary, marginTop: 4 },
  version: { fontFamily: t.typography.fontRegular, fontSize: 12, color: t.colors.textMuted, marginTop: 8 },

  section: {
    marginTop: 20,
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

  footer: {
    marginTop: 28, textAlign: 'center',
    fontFamily: t.typography.fontRegular, fontSize: 12,
    color: t.colors.textMuted,
  },
});
