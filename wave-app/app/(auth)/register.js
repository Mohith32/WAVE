import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { api, setAuthToken } from '../../utils/api';
import { storage } from '../../utils/storage';
import { generateKeyPair } from '../../utils/crypto';
import { connectWebSocket } from '../../utils/websocket';
import { theme, ghostBorder } from '../../utils/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const keyPair = await generateKeyPair();
      await storage.saveKeyPair(keyPair.publicKey, keyPair.privateKey);

      const res = await api.register(email.trim(), password, displayName.trim(), keyPair.publicKey);
      if (res.success) {
        const loginRes = await api.login(email.trim(), password);
        if (loginRes.success) {
          const { token, userId, email: userEmail, displayName: name } = loginRes.data;
          setAuthToken(token);
          await storage.saveSession(token, userId, userEmail, name);
          connectWebSocket(token);
          router.replace('/(main)/chats');
        } else {
          router.replace('/(auth)/login');
        }
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (e) {
      setError('Connection error. Check your server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          
          <View style={s.logoArea}>
            <Text style={s.title}>SECURE NODE</Text>
            <Text style={s.subtitle}>GENERATE YOUR LOCAL KEYS</Text>
          </View>

          <BlurView tint="dark" intensity={40} style={[s.formCard, ghostBorder]}>
            <View style={s.form}>
              <View style={[s.inputWrap, ghostBorder]}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textVariant} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Network Alias (Display Name)"
                  placeholderTextColor={theme.colors.placeholder}
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>

              <View style={[s.inputWrap, ghostBorder]}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textVariant} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Email Address"
                  placeholderTextColor={theme.colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={[s.inputWrap, ghostBorder]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textVariant} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Root Password"
                  placeholderTextColor={theme.colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textVariant} />
                </TouchableOpacity>
              </View>

              <View style={[s.inputWrap, ghostBorder]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textVariant} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Verify Root Password"
                  placeholderTextColor={theme.colors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.8} style={s.btnWrapper}>
                <LinearGradient
                  colors={[theme.colors.primaryGradientStart, theme.colors.primaryGradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.background} />
                  ) : (
                    <Text style={s.btnText}>INITIALIZE NODE</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={s.footer}>
                <Text style={s.footerText}>CONNECTION RESTORE? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={s.footerLink}>AUTHENTICATE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          <View style={[s.infoBox, ghostBorder]}>
            <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.secondary} />
            <Text style={s.infoText}>
              ASYMMETRIC KEYS GENERATED LOCALLY.
            </Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 24, paddingVertical: 40 },
  logoArea: { alignItems: 'flex-start', marginBottom: 24, marginLeft: 8 },
  title: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.lg, 
    color: theme.colors.primary, 
    letterSpacing: 3 
  },
  subtitle: { 
    fontFamily: theme.typography.fontLight, 
    fontSize: theme.fontSize.xs, 
    color: theme.colors.secondary, 
    marginTop: 4, 
    letterSpacing: 2 
  },
  formCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceBase,
    overflow: 'hidden',
    ...theme.elevation.floating,
  },
  form: { gap: theme.spacing.lg },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: 20, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, color: theme.colors.text, 
    fontFamily: theme.typography.fontRegular, fontSize: theme.fontSize.md,
    letterSpacing: 0.5,
  },
  eyeBtn: { padding: 4 },
  error: { color: theme.colors.error, fontSize: theme.fontSize.sm, fontFamily: theme.typography.fontRegular, textAlign: 'center' },
  btnWrapper: {
    ...theme.elevation.floating,
    marginTop: 8,
  },
  btn: {
    height: 56, borderRadius: theme.borderRadius.xl,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText: { 
    color: theme.colors.background, fontSize: theme.fontSize.sm, 
    fontFamily: theme.typography.fontSemiBold, letterSpacing: theme.typography.trackingLabel 
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  footerText: { color: theme.colors.textVariant, fontSize: theme.fontSize.xs, fontFamily: theme.typography.fontLight, letterSpacing: 1 },
  footerLink: { color: theme.colors.secondary, fontSize: theme.fontSize.xs, fontFamily: theme.typography.fontSemiBold, letterSpacing: 1 },
  
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 24, paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: theme.colors.surfaceBase,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  infoText: { flex: 1, color: theme.colors.secondary, fontSize: 10, fontFamily: theme.typography.fontSemiBold, tracking: 1 },
});
