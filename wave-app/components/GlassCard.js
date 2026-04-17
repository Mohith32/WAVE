import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../utils/theme';

/**
 * Subtle frosted card used for list rows and panels.
 * Not a real backdrop-filter (RN doesn't support that on arbitrary nodes) —
 * uses the theme's surface token + hairline border so it reads as elevated.
 */
function GlassCard({ children, style, elevated = false, padding = 0 }) {
  const theme = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={[
      s.base,
      elevated && s.elevated,
      { padding },
      style,
    ]}>
      {children}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  base: {
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.hairline,
    borderRadius: t.borderRadius.xl,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: t.colors.surfaceElevated,
    ...t.shadow.md,
  },
});

export default memo(GlassCard);
