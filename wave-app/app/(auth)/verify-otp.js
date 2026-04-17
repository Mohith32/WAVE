import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../../components/GradientButton';
import { api, setAuthToken } from '../../utils/api';
import { storage } from '../../utils/storage';
import { connectWebSocket } from '../../utils/websocket';
import { registerForPushNotifications } from '../../utils/notifications';
import { useTheme } from '../../utils/theme';

const CODE_LEN = 6;
const RESEND_AFTER = 45;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { email, displayName, username, password, publicKey, privateKey } = useLocalSearchParams();

  const [digits, setDigits] = useState(Array(CODE_LEN).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_AFTER);
  const inputsRef = useRef([]);

  useEffect(() => {
    const t = setInterval(() => setResendIn((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const setDigit = (idx, val) => {
    const clean = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits]; next[idx] = clean;
    setDigits(next);
    if (clean && idx < CODE_LEN - 1) inputsRef.current[idx + 1]?.focus();
    if (clean && idx === CODE_LEN - 1 && next.every(d => d)) handleVerify(next.join(''));
  };

  const onKeyPress = (idx, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };

  const handleVerify = async (codeOverride) => {
    const code = codeOverride || digits.join('');
    if (code.length !== CODE_LEN) return Alert.alert('Incomplete', 'Enter the 6-digit code.');
    setVerifying(true);
    try {
      const vr = await api.verifyOtp(email, code);
      if (!vr.success) { Alert.alert('Verification failed', vr.message || 'Invalid code.'); setVerifying(false); return; }
      const rr = await api.register({ displayName, username, email, password, publicKey });
      if (!rr.success) { Alert.alert('Registration failed', rr.message || 'Please try again.'); setVerifying(false); return; }
      const lr = await api.login({ email, password });
      if (lr.success) {
        const { token, userId, displayName: dn, email: ue } = lr.data;
        setAuthToken(token);
        await storage.saveSession({ token, userId, displayName: dn, email: ue });
        await storage.saveKeyPair({ publicKey, privateKey });
        connectWebSocket(token);
        registerForPushNotifications();
        router.replace('/(main)/chats');
      } else {
        Alert.alert('Login failed', lr.message || 'Please sign in manually.');
        router.replace('/(auth)/login');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    const res = await api.requestOtp(email);
    if (res.success) {
      setResendIn(RESEND_AFTER);
      setDigits(Array(CODE_LEN).fill(''));
      inputsRef.current[0]?.focus();
      Alert.alert('Code sent', `New code emailed to ${email}`);
    } else Alert.alert('Could not resend', res.message || 'Try again soon.');
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => [s.back, { opacity: pressed ? 0.5 : 1 }]}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        <Text style={s.backText}>Back</Text>
      </Pressable>

      <View style={s.hero}>
        <View style={s.icon}>
          <Ionicons name="mail" size={36} color="#fff" />
        </View>
        <Text style={s.title}>Check your email</Text>
        <Text style={s.tagline}>
          Code sent to{'\n'}
          <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontSemiBold }}>{email}</Text>
        </Text>
      </View>

      <View style={s.codeRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => (inputsRef.current[i] = r)}
            style={[s.codeCell, d && s.codeCellFilled]}
            value={d}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={(e) => onKeyPress(i, e)}
            keyboardType="number-pad" maxLength={1}
            textContentType="oneTimeCode"
            autoFocus={i === 0} selectTextOnFocus
          />
        ))}
      </View>

      <GradientButton
        title="Verify"
        loading={verifying}
        onPress={() => handleVerify()}
        size="lg"
      />

      <Pressable onPress={handleResend} disabled={resendIn > 0} style={s.resendWrap}>
        {({ pressed }) => (
          <Text style={[s.resend, resendIn === 0 && { color: theme.colors.primary }, { opacity: pressed ? 0.5 : 1 }]}>
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background, padding: 24, paddingTop: 60 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: t.colors.primary, fontSize: 17, fontFamily: t.typography.fontRegular, marginLeft: -4 },

  hero: { alignItems: 'center', marginBottom: 32 },
  icon: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  title: { fontFamily: t.typography.fontSemiBold, fontSize: 24, color: t.colors.text, letterSpacing: -0.5 },
  tagline: {
    fontFamily: t.typography.fontRegular, fontSize: 15,
    color: t.colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 22,
  },

  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
  codeCell: {
    width: 48, height: 58,
    borderRadius: 10,
    borderWidth: 1, borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    textAlign: 'center',
    fontSize: 24, fontFamily: t.typography.fontSemiBold,
    color: t.colors.text,
  },
  codeCellFilled: { borderColor: t.colors.primary },

  resendWrap: { alignItems: 'center', marginTop: 18, padding: 8 },
  resend: { fontFamily: t.typography.fontRegular, fontSize: 15, color: t.colors.textMuted },
});
