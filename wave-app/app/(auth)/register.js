import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Username too short', 'Use at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      Alert.alert('Invalid username', 'Only letters, numbers, _ and . allowed.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Generate keys now so they're ready when we register after OTP verify
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
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={s.header}>
          <View style={s.logoBox}>
            <Ionicons name="person-add" size={44} color="#FFFFFF" />
          </View>
          <Text style={s.title}>Create an account</Text>
          <Text style={s.tagline}>Join Wave and start messaging</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Display Name</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Your name"
              placeholderTextColor={theme.colors.placeholder}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <Text style={[s.label, { marginTop: 18 }]}>Username</Text>
          <View style={s.inputWrap}>
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.lg, marginRight: 4 }}>@</Text>
            <TextInput
              style={s.input}
              placeholder="your_handle"
              placeholderTextColor={theme.colors.placeholder}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          <Text style={[s.label, { marginTop: 18 }]}>Email</Text>
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
              placeholder="Min. 6 characters"
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
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>SEND VERIFICATION CODE</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.link} onPress={() => router.back()}>
          <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },

  backBtn: { padding: 4, marginBottom: 16 },

  header: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 24, color: t.colors.text, textAlign: 'center',
  },
  tagline: {
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md, color: t.colors.textSecondary,
    marginTop: 6, textAlign: 'center',
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
    marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md,
    letterSpacing: 1,
  },

  link: { alignItems: 'center', marginTop: 24 },
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
