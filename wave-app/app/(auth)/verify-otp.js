import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, setAuthToken } from '../../utils/api';
import { storage } from '../../utils/storage';
import { connectWebSocket } from '../../utils/websocket';
import { registerForPushNotifications } from '../../utils/notifications';
import { useTheme } from '../../utils/theme';

const CODE_LEN = 6;
const RESEND_AFTER = 45; // seconds

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
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    if (clean && idx < CODE_LEN - 1) inputsRef.current[idx + 1]?.focus();
    if (clean && idx === CODE_LEN - 1 && next.every((d) => d)) {
      handleVerify(next.join(''));
    }
  };

  const onKeyPress = (idx, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (codeOverride) => {
    const code = codeOverride || digits.join('');
    if (code.length !== CODE_LEN) {
      Alert.alert('Incomplete', 'Enter the 6-digit code.');
      return;
    }
    setVerifying(true);
    try {
      const verifyRes = await api.verifyOtp(email, code);
      if (!verifyRes.success) {
        Alert.alert('Verification failed', verifyRes.message || 'Invalid code.');
        setVerifying(false);
        return;
      }

      // Code valid — now register the account
      const regRes = await api.register({
        displayName,
        username,
        email,
        password,
        publicKey,
      });
      if (!regRes.success) {
        Alert.alert('Registration failed', regRes.message || 'Please try again.');
        setVerifying(false);
        return;
      }

      // Registered — log in
      const loginRes = await api.login({ email, password });
      if (loginRes.success) {
        const { token, userId, displayName: dn, email: userEmail } = loginRes.data;
        setAuthToken(token);
        await storage.saveSession({ token, userId, displayName: dn, email: userEmail });
        await storage.saveKeyPair({ publicKey, privateKey });
        connectWebSocket(token);
        registerForPushNotifications();
        router.replace('/(main)/chats');
      } else {
        Alert.alert('Logged in failed', loginRes.message || 'Please try logging in.');
        router.replace('/(auth)/login');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    const res = await api.requestOtp(email);
    if (res.success) {
      setResendIn(RESEND_AFTER);
      setDigits(Array(CODE_LEN).fill(''));
      inputsRef.current[0]?.focus();
      Alert.alert('Code sent', `A new code was emailed to ${email}`);
    } else {
      Alert.alert('Could not resend', res.message || 'Try again soon.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={s.header}>
        <View style={s.iconBox}>
          <Ionicons name="mail" size={44} color="#FFFFFF" />
        </View>
        <Text style={s.title}>Check your email</Text>
        <Text style={s.tagline}>
          We sent a 6-digit code to{'\n'}
          <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontSemiBold }}>
            {email}
          </Text>
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
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            autoFocus={i === 0}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[s.btn, verifying && s.btnDisabled]}
        onPress={() => handleVerify()}
        disabled={verifying}
        activeOpacity={0.85}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={s.btnText}>VERIFY</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.resendBtn}
        onPress={handleResend}
        disabled={resendIn > 0}
      >
        <Text style={[s.resendText, resendIn === 0 && { color: theme.colors.primary }]}>
          {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background, paddingTop: 60, paddingHorizontal: 24 },
  backBtn: { padding: 4, marginBottom: 16 },

  header: { alignItems: 'center', marginBottom: 36 },
  iconBox: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  title: { fontFamily: t.typography.fontSemiBold, fontSize: 24, color: t.colors.text },
  tagline: {
    fontFamily: t.typography.fontRegular, fontSize: t.fontSize.md,
    color: t.colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22,
  },

  codeRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 36,
  },
  codeCell: {
    width: 46, height: 58,
    borderRadius: 10,
    borderWidth: 1.5, borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: t.typography.fontSemiBold,
    color: t.colors.text,
  },
  codeCellFilled: { borderColor: t.colors.primary },

  btn: {
    height: 52, borderRadius: t.borderRadius.md,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md, letterSpacing: 1,
  },

  resendBtn: { alignItems: 'center', marginTop: 20, padding: 8 },
  resendText: { fontFamily: t.typography.fontRegular, fontSize: t.fontSize.sm, color: t.colors.textMuted },
});
