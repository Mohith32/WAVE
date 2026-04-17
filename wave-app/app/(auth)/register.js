import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../../components/GradientButton';
import { api } from '../../utils/api';
import { generateKeyPair } from '../../utils/crypto';
import { useTheme } from '../../utils/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Fill in all fields.');
      return;
    }
    if (username.length < 3) return Alert.alert('Username too short', 'At least 3 characters.');
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) return Alert.alert('Invalid username', 'Letters, numbers, _ and . only.');
    if (password.length < 6) return Alert.alert('Weak password', 'At least 6 characters.');

    setLoading(true);
    try {
      const keyPair = await generateKeyPair();
      const cleanEmail = email.trim().toLowerCase();
      const otpRes = await api.requestOtp(cleanEmail);
      if (!otpRes.success) {
        Alert.alert('Could not send code', otpRes.message || 'Try again.');
        return;
      }
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: cleanEmail,
          displayName: displayName.trim(),
          username: username.trim().toLowerCase(),
          password,
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
        },
      });
    } catch {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [s.back, { opacity: pressed ? 0.5 : 1 }]}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <View style={s.hero}>
          <Text style={s.title}>Create account</Text>
          <Text style={s.tagline}>Claim your handle on Wave</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Name"
              placeholderTextColor={theme.colors.placeholder}
              value={displayName} onChangeText={setDisplayName}
            />
          </View>
          <View style={s.divider} />
          <View style={s.inputRow}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 17, marginRight: 2 }}>@</Text>
            <TextInput
              style={s.input}
              placeholder="username"
              placeholderTextColor={theme.colors.placeholder}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              autoCapitalize="none" autoCorrect={false} maxLength={20}
            />
          </View>
          <View style={s.divider} />
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
              placeholder="Password (min. 6)"
              placeholderTextColor={theme.colors.placeholder}
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <GradientButton
          title="Continue"
          loading={loading}
          onPress={handleRegister}
          size="lg"
          style={{ marginTop: 20 }}
        />

        <Text style={s.footnote}>
          We'll send a verification code to your email.
        </Text>

        <Pressable onPress={() => router.back()} style={s.linkWrap}>
          {({ pressed }) => (
            <Text style={[s.link, { opacity: pressed ? 0.5 : 1 }]}>
              Already have an account?  <Text style={s.linkBold}>Sign in</Text>
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },

  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: t.colors.primary, fontSize: 17, fontFamily: t.typography.fontRegular, marginLeft: -4 },

  hero: { marginBottom: 24 },
  title: { fontFamily: t.typography.fontSemiBold, fontSize: 28, color: t.colors.text, letterSpacing: -0.5 },
  tagline: { fontFamily: t.typography.fontRegular, fontSize: 15, color: t.colors.textMuted, marginTop: 4 },

  form: {
    backgroundColor: t.colors.surface,
    borderRadius: 12, overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },
  input: { flex: 1, color: t.colors.text, fontFamily: t.typography.fontRegular, fontSize: 17, padding: 0 },

  footnote: {
    fontFamily: t.typography.fontRegular, fontSize: 13,
    color: t.colors.textMuted, marginTop: 10, marginHorizontal: 4, textAlign: 'center',
  },
  linkWrap: { alignItems: 'center', marginTop: 22, padding: 8 },
  link: { fontFamily: t.typography.fontRegular, fontSize: 15, color: t.colors.textMuted },
  linkBold: { fontFamily: t.typography.fontSemiBold, color: t.colors.primary },
});
