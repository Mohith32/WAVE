import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BlurHeader from '../../components/BlurHeader';
import { useTheme } from '../../utils/theme';

const APP_VERSION = '1.0.0';
const GITHUB_URL = 'https://github.com/Mohith32/WAVE';

export default function AboutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const open = (url) => Linking.openURL(url).catch(() => {});

  const rows = [
    { label: 'Version', value: APP_VERSION },
    { label: 'Source code', onPress: () => open(GITHUB_URL) },
    { label: 'Terms of Service' },
    { label: 'Privacy Policy' },
  ];

  return (
    <View style={s.container}>
      <BlurHeader title="About" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={s.hero}>
          <View style={s.logo}>
            <Ionicons name="paper-plane" size={38} color="#fff" />
          </View>
          <Text style={s.appName}>Wave</Text>
          <Text style={s.tagline}>End-to-end encrypted messaging</Text>
        </View>

        <View style={s.section}>
          {rows.map((r, idx) => {
            const tappable = !!r.onPress;
            return (
              <View key={r.label}>
                <Pressable
                  onPress={r.onPress}
                  disabled={!tappable}
                  style={({ pressed }) => [s.row, pressed && tappable && s.pressed]}
                >
                  <Text style={[s.rowLabel, { flex: 1 }]}>{r.label}</Text>
                  {r.value ? <Text style={s.rowValue}>{r.value}</Text> : null}
                  {tappable && <Ionicons name="chevron-forward" size={16} color={theme.colors.textGhost} />}
                </Pressable>
                {idx < rows.length - 1 && <View style={s.divider} />}
              </View>
            );
          })}
        </View>

        <Text style={s.footer}>Built by Mikey</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  logo: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  appName: { fontFamily: t.typography.fontSemiBold, fontSize: 28, color: t.colors.text, letterSpacing: -0.5 },
  tagline: { fontFamily: t.typography.fontRegular, fontSize: 13, color: t.colors.textMuted, marginTop: 4 },

  section: { backgroundColor: t.colors.surface, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, minHeight: 44 },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.text },
  rowValue: { fontFamily: t.typography.fontRegular, fontSize: 15, color: t.colors.textMuted, marginRight: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },

  footer: { marginTop: 24, textAlign: 'center', fontFamily: t.typography.fontRegular, fontSize: 12, color: t.colors.textMuted },
});
