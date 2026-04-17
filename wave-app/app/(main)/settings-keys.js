import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Share, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BlurHeader from '../../components/BlurHeader';
import GradientButton from '../../components/GradientButton';
import { useTheme } from '../../utils/theme';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';
import { generateKeyPair } from '../../utils/crypto';

export default function EncryptionKeysScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [keyPair, setKeyPair] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { storage.getKeyPair().then(setKeyPair); }, []);

  const shareKey = async () => {
    if (!keyPair?.publicKey) return;
    try {
      await Share.share({ message: `My Wave public key:\n\n${keyPair.publicKey}`, title: 'Wave Public Key' });
    } catch {}
  };

  const regenerate = () => {
    Alert.alert('Regenerate keys?', 'Old messages may become unreadable.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate', style: 'destructive',
        onPress: async () => {
          setRegenerating(true);
          try {
            const newKp = await generateKeyPair();
            await storage.saveKeyPair(newKp);
            const session = await storage.getSession();
            if (session?.token) await api.updatePublicKey(session.token, newKp.publicKey);
            setKeyPair(newKp);
            Alert.alert('Done', 'New encryption keys generated.');
          } catch {
            Alert.alert('Error', 'Could not regenerate keys.');
          } finally { setRegenerating(false); }
        },
      },
    ]);
  };

  const shortKey = keyPair?.publicKey ? `${keyPair.publicKey.slice(0, 20)}…${keyPair.publicKey.slice(-12)}` : '—';

  return (
    <View style={s.container}>
      <BlurHeader title="Encryption Keys" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={s.sectionLabel}>YOUR PUBLIC KEY</Text>
        <View style={s.section}>
          <View style={s.keyBox}>
            <Text style={s.keyText} selectable>{shortKey}</Text>
          </View>
          <View style={s.divider} />
          <Pressable onPress={shareKey} style={({ pressed }) => [s.row, pressed && s.pressed]}>
            <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.primary, marginLeft: 10 }]}>Share Public Key</Text>
          </Pressable>
        </View>
        <Text style={s.footnote}>
          Your private key never leaves this device. Share your public key to verify your identity.
        </Text>

        <Text style={s.sectionLabel}>ACTIONS</Text>
        <View style={s.section}>
          <Pressable
            onPress={regenerate}
            disabled={regenerating}
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.error} />
            <Text style={[s.rowLabel, { color: theme.colors.error, marginLeft: 10 }]}>
              {regenerating ? 'Regenerating…' : 'Regenerate Keys'}
            </Text>
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
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: 12, overflow: 'hidden',
  },
  keyBox: {
    padding: 14,
  },
  keyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: t.colors.text },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  rowLabel: { fontFamily: t.typography.fontRegular, fontSize: 17 },
  footnote: {
    fontFamily: t.typography.fontRegular, fontSize: 13,
    color: t.colors.textMuted, marginTop: 6, marginHorizontal: 12, lineHeight: 18,
  },
});
