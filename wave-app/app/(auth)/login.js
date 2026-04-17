import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      Alert.alert('Missing fields', 'Please enter your email and password.');
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
        // Fire-and-forget — fails silently in Expo Go
        registerForPushNotifications();
        router.replace('/(main)/chats');
      } else {
        Alert.alert('Login failed', res.message || 'Invalid credentials.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.logoBox}>
            <Ionicons name="paper-plane" size={46} color="#FFFFFF" />
          </View>
          <Text style={s.appName}>Wave</Text>
          <Text style={s.tagline}>Please confirm your account</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={[s.label, { marginTop: 18 }]}>Password</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Your password"
              placeholderTextColor={theme.colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>NEXT</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.link} onPress={() => router.push('/(auth)/register')}>
          <Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Create one</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 30, color: t.colors.text, letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md, color: t.colors.textSecondary,
    marginTop: 8, textAlign: 'center',
  },

  form: { paddingHorizontal: 4 },
  label: {
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.sm,
    color: t.colors.primary,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: t.colors.primary,
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    color: t.colors.text,
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.lg,
    paddingVertical: 4,
  },

  btn: {
    height: 52, borderRadius: t.borderRadius.md,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 32,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md,
    letterSpacing: 1,
  },

  link: { alignItems: 'center', marginTop: 28 },
  linkText: {
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
  },
  linkBold: {
    fontFamily: t.typography.fontSemiBold,
    color: t.colors.primary,
  },
});
