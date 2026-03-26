import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { api, setAuthToken } from '../../utils/api';
import { storage } from '../../utils/storage';
import { connectWebSocket } from '../../utils/websocket';
import { theme, ghostBorder } from '../../utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email.trim(), password);
      if (res.success) {
        const { token, userId, email: userEmail, displayName } = res.data;
        setAuthToken(token);
        await storage.saveSession(token, userId, userEmail, displayName);
        connectWebSocket(token);
        router.replace('/(main)/chats');
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (e) {
      setError('Connection error. Check your server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        {/* Logo & Title */}
        <View style={s.logoArea}>
          <BlurView tint="dark" intensity={60} style={[s.logoCircle, ghostBorder]}>
            <Ionicons name="finger-print" size={32} color={theme.colors.primary} />
          </BlurView>
          <Text style={s.title}>WAVE</Text>
          <Text style={s.subtitle}>END-TO-END ENCRYPTED</Text>
        </View>

        {/* Form Container */}
        <BlurView tint="dark" intensity={40} style={[s.formCard, ghostBorder]}>
          <View style={s.form}>
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
                placeholder="Secure Password"
                placeholderTextColor={theme.colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textVariant} />
              </TouchableOpacity>
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8} style={s.btnWrapper}>
              <LinearGradient
                colors={[theme.colors.primaryGradientStart, theme.colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={s.btnText}>AUTHENTICATE</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerText}>DON'T HAVE AN ACCOUNT? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={s.footerLink}>INITIALIZE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoArea: { alignItems: 'center', marginBottom: theme.spacing.xl },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  title: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.xxl, 
    color: theme.colors.primary, 
    letterSpacing: 4 
  },
  subtitle: { 
    fontFamily: theme.typography.fontLight, 
    fontSize: theme.fontSize.xs, 
    color: theme.colors.secondary, 
    marginTop: 6, 
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
    borderRadius: theme.borderRadius.xl, // Super-ellipse
    paddingHorizontal: 20, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, 
    color: theme.colors.text, 
    fontFamily: theme.typography.fontRegular,
    fontSize: theme.fontSize.md,
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
    color: theme.colors.background, 
    fontSize: theme.fontSize.sm, 
    fontFamily: theme.typography.fontSemiBold,
    letterSpacing: theme.typography.trackingLabel,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: theme.colors.textVariant, fontSize: theme.fontSize.xs, fontFamily: theme.typography.fontLight, letterSpacing: 1 },
  footerLink: { color: theme.colors.secondary, fontSize: theme.fontSize.xs, fontFamily: theme.typography.fontSemiBold, letterSpacing: 1 },
});
