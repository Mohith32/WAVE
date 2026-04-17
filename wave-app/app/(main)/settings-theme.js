import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BlurHeader from '../../components/BlurHeader';
import { useTheme } from '../../utils/theme';

export default function AppearanceScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const options = [
    { key: 'system', label: 'Automatic' },
    { key: 'light',  label: 'Light' },
    { key: 'dark',   label: 'Dark' },
  ];

  return (
    <View style={s.container}>
      <BlurHeader title="Appearance" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={s.sectionLabel}>APPEARANCE</Text>
        <View style={s.section}>
          {options.map((opt, idx) => {
            const selected = theme.preference === opt.key;
            return (
              <View key={opt.key}>
                <Pressable
                  onPress={() => theme.setPreference(opt.key)}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                >
                  <Text style={s.rowLabel}>{opt.label}</Text>
                  {selected && <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}
                </Pressable>
                {idx < options.length - 1 && <View style={s.divider} />}
              </View>
            );
          })}
        </View>
        <Text style={s.footnote}>
          Choose Automatic to follow your device's appearance setting.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  sectionLabel: {
    fontFamily: t.typography.fontRegular, fontSize: 13, letterSpacing: 0.3,
    color: t.colors.textMuted, marginTop: 16, marginBottom: 6, marginLeft: 12,
    textTransform: 'uppercase',
  },
  section: { backgroundColor: t.colors.surface, borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 44,
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.text },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },
  footnote: {
    fontFamily: t.typography.fontRegular, fontSize: 13,
    color: t.colors.textMuted, marginTop: 6, marginHorizontal: 12, lineHeight: 18,
  },
});
