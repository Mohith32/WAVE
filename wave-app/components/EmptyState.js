import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

function EmptyState({ icon = 'inbox-outline', title, subtitle, children }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.container}>
      <Ionicons name={icon} size={64} color={theme.colors.textMuted} style={{ opacity: 0.5 }} />
      {title && <Text style={s.title}>{title}</Text>}
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.lg,
    color: t.colors.text,
    marginTop: 16, marginBottom: 6, textAlign: 'center',
  },
  subtitle: {
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.sm,
    color: t.colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
});

export default memo(EmptyState);
