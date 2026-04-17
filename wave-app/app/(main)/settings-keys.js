import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';
import { generateKeyPair } from '../../utils/crypto';

export default function EncryptionKeysScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [keyPair, setKeyPair] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    const kp = await storage.getKeyPair();
    setKeyPair(kp);
  };

  const sharePublicKey = async () => {
    if (!keyPair?.publicKey) return;
    try {
      await Share.share({
        message: `My Wave public key:\n\n${keyPair.publicKey}`,
        title: 'Wave Public Key',
      });
    } catch {}
  };

  const regenerateKeys = async () => {
    Alert.alert(
      'Regenerate keys?',
      'This will create new encryption keys. Old messages encrypted with the previous key may become unreadable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const newKp = await generateKeyPair();
              await storage.saveKeyPair(newKp);
              const session = await storage.getSession();
              if (session?.token) await api.updatePublicKey(session.token, newKp.publicKey);
              setKeyPair(newKp);
              Alert.alert('Done', 'New encryption keys generated.');
            } catch (e) {
              Alert.alert('Error', 'Could not regenerate keys.');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const shortKey = keyPair?.publicKey
    ? `${keyPair.publicKey.slice(0, 20)}…${keyPair.publicKey.slice(-12)}`
    : '—';

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Encryption Keys</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.card}>
          <View style={s.iconCircle}>
            <Ionicons name="key" size={28} color="#fff" />
          </View>
          <Text style={s.title}>End-to-End Encrypted</Text>
          <Text style={s.subtitle}>
            Messages are encrypted on your device and decrypted on the recipient's device. Not even Wave can read them.
          </Text>
        </View>

        <Text style={s.sectionLabel}>YOUR PUBLIC KEY</Text>
        <View style={s.keyBox}>
          <Text style={s.keyText} selectable>{shortKey}</Text>
          <TouchableOpacity onPress={sharePublicKey} style={s.copyBtn}>
            <Ionicons name="share-outline" size={18} color={theme.colors.primary} />
            <Text style={s.copyText}>Share</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>
          Share this with others to verify your identity. Your private key never leaves this device.
        </Text>

        <TouchableOpacity
          style={[s.dangerBtn, regenerating && { opacity: 0.5 }]}
          onPress={regenerateKeys}
          disabled={regenerating}
        >
          <Ionicons name="refresh" size={18} color={theme.colors.error} />
          <Text style={s.dangerText}>
            {regenerating ? 'Regenerating…' : 'Regenerate Keys'}
          </Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: t.colors.surfaceMuted,
    borderRadius: t.borderRadius.xl,
    padding: 20, alignItems: 'center', marginBottom: 20,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontFamily: t.typography.fontSemiBold, fontSize: t.fontSize.lg, color: t.colors.text, marginBottom: 6 },
  subtitle: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.sm, color: t.colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  sectionLabel: {
    fontFamily: t.typography.fontMedium, fontSize: t.fontSize.xs,
    color: t.colors.textMuted, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5,
  },
  keyBox: {
    backgroundColor: t.colors.surface,
    borderRadius: t.borderRadius.md,
    padding: 14, borderWidth: 0.5, borderColor: t.colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  keyText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: t.colors.text },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10, padding: 6 },
  copyText: { fontFamily: t.typography.fontSemiBold, fontSize: 13, color: t.colors.primary },

  hint: { fontFamily: t.typography.fontRegular, fontSize: 12, color: t.colors.textMuted, marginTop: 10, marginHorizontal: 4 },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 30, paddingVertical: 14,
    backgroundColor: t.colors.surface,
    borderRadius: t.borderRadius.md,
    borderWidth: 1, borderColor: t.colors.error + '55',
  },
  dangerText: { fontFamily: t.typography.fontSemiBold, fontSize: t.fontSize.md, color: t.colors.error },
});
