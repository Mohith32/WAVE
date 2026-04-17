import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BlurHeader from '../../components/BlurHeader';
import { useTheme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { setAuthToken } from '../../utils/api';
import { disconnectWebSocket } from '../../utils/websocket';

export default function PrivacyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const handleDelete = () => {
    Alert.alert(
      'Delete account?',
      'This signs you out and clears all local data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out & Clear', style: 'destructive',
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

  return (
    <View style={s.container}>
      <BlurHeader title="Privacy & Security" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={s.sectionLabel}>PROTECTION</Text>
        <View style={s.section}>
          <View style={s.row}>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>End-to-End Encryption</Text>
              <Text style={s.rowSub}>Active · messages encrypted on-device</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>Secure Storage</Text>
              <Text style={s.rowSub}>Keys stored in OS keychain</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>No Analytics</Text>
              <Text style={s.rowSub}>We don't track your activity</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          </View>
        </View>

        <Text style={s.sectionLabel}>MANAGE</Text>
        <View style={s.section}>
          <Pressable
            onPress={() => router.push('/(main)/settings-keys')}
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <Text style={[s.rowLabel, { flex: 1 }]}>Encryption keys</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textGhost} />
          </Pressable>
          <View style={s.divider} />
          <Pressable onPress={handleDelete} style={({ pressed }) => [s.row, pressed && s.pressed]}>
            <Text style={[s.rowLabel, { color: theme.colors.error }]}>Delete account</Text>
          </Pressable>
        </View>
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, minHeight: 44 },
  rowContent: { flex: 1 },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.text },
  rowSub: { fontFamily: t.typography.fontRegular, fontSize: 13, color: t.colors.textMuted, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },
});
