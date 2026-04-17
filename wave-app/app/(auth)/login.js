import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../../components/GradientButton';
import { api, setAuthToken } from '../../utils/api';
import { storage } from '../../utils/storage';
import { connectWebSocket } from '../../utils/websocket';
import { generateKeyPair } from '../../utils/crypto';
import { registerForPushNotifications } from '../../utils/notifications';
import { useTheme } from '../../utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({ email: email.trim(), password });
      if (res.success) {
        const { token, userId, displayName, email: userEmail } = res.data;
        let keyPair = await storage.getKeyPair();
        if (!keyPair) {
          keyPair = await generateKeyPair();
          await storage.saveKeyPair(keyPair);
          await api.updatePublicKey(token, keyPair.publicKey);
        }
        setAuthToken(token);
        await storage.saveSession({ token, userId, displayName, email: userEmail });
        connectWebSocket(token);
        registerForPushNotifications();
        router.replace('/(main)/chats');
      } else {
        Alert.alert('Login failed', res.message || 'Invalid credentials.');
      }
    } catch {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View style={s.logo}>
            <Ionicons name="paper-plane" size={34} color="#fff" />
          </View>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.tagline}>Sign in to continue</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={theme.colors.placeholder}
              value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
            />
          </View>
          <View style={s.divider} />
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={theme.colors.placeholder}
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20} color={theme.colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <GradientButton
          title="Sign in"
          loading={loading}
          onPress={handleLogin}
          size="lg"
          style={{ marginTop: 20 }}
        />

        <Pressable onPress={() => router.push('/(auth)/register')} style={s.linkWrap}>
          {({ pressed }) => (
            <Text style={[s.link, { opacity: pressed ? 0.5 : 1 }]}>
              New here?  <Text style={s.linkBold}>Create account</Text>
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  hero: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontFamily: t.typography.fontSemiBold, fontSize: 28, color: t.colors.text, letterSpacing: -0.5 },
  tagline: {
    fontFamily: t.typography.fontRegular, fontSize: 15,
    color: t.colors.textMuted, marginTop: 6,
  },

  form: {
    backgroundColor: t.colors.surface,
    borderRadius: 12, overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 10,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },
  input: {
    flex: 1, color: t.colors.text,
    fontFamily: t.typography.fontRegular, fontSize: 17, padding: 0,
  },

  linkWrap: { alignItems: 'center', marginTop: 22, padding: 8 },
  link: { fontFamily: t.typography.fontRegular, fontSize: 15, color: t.colors.textMuted },
  linkBold: { fontFamily: t.typography.fontSemiBold, color: t.colors.primary },
});
