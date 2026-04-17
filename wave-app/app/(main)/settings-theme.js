import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';

export default function ThemeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const options = [
    { key: 'system', label: 'System default', icon: 'phone-portrait', sub: 'Follow your device' },
    { key: 'light', label: 'Light', icon: 'sunny', sub: 'Bright and clear' },
    { key: 'dark', label: 'Dark', icon: 'moon', sub: 'Easy on the eyes' },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Theme</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 16 }}>
        <View style={s.previewBox}>
          <View style={[s.previewBubbleL]}>
            <Text style={s.previewTextL}>Hey! 👋</Text>
          </View>
          <View style={[s.previewBubbleR]}>
            <Text style={s.previewTextR}>Looking fresh</Text>
          </View>
        </View>

        <View style={s.section}>
          {options.map((opt, idx) => {
            const selected = theme.preference === opt.key;
            return (
              <View key={opt.key}>
                <TouchableOpacity
                  style={s.row}
                  onPress={() => theme.setPreference(opt.key)}
                  activeOpacity={0.6}
                >
                  <View style={[s.rowIconBox, selected && s.rowIconBoxActive]}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={selected ? '#fff' : theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{opt.label}</Text>
                    <Text style={s.rowSub}>{opt.sub}</Text>
                  </View>
                  <View style={[s.radioOuter, selected && s.radioOuterActive]}>
                    {selected && <View style={s.radioInner} />}
                  </View>
                </TouchableOpacity>
                {idx < options.length - 1 && <View style={s.divider} />}
              </View>
            );
          })}
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

  previewBox: {
    marginHorizontal: 16, marginBottom: 20,
    padding: 16, borderRadius: 14,
    backgroundColor: t.colors.chatBg,
    borderWidth: 0.5, borderColor: t.colors.border,
  },
  previewBubbleL: {
    alignSelf: 'flex-start', maxWidth: '70%',
    backgroundColor: t.colors.bubbleReceived,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderBottomLeftRadius: 4,
    borderWidth: t.isDark ? 0 : 0.5, borderColor: t.colors.bubbleBorder,
    marginBottom: 4,
  },
  previewBubbleR: {
    alignSelf: 'flex-end', maxWidth: '70%',
    backgroundColor: t.colors.bubbleSent,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderBottomRightRadius: 4,
  },
  previewTextL: { fontSize: t.fontSize.md, color: t.colors.bubbleReceivedText, fontFamily: t.typography.fontRegular },
  previewTextR: { fontSize: t.fontSize.md, color: t.colors.bubbleSentText, fontFamily: t.typography.fontRegular },

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
  rowIconBoxActive: { backgroundColor: t.colors.primary },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.md, color: t.colors.text },
  rowSub: { fontFamily: t.typography.fontRegular, fontSize: 12, color: t.colors.textMuted, marginTop: 2 },
  divider: { height: 0.5, marginLeft: 64, backgroundColor: t.colors.borderLight },

  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: t.colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: t.colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.primary },
});
