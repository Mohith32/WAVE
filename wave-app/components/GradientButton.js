import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

/**
 * iOS-style solid button (kept name for compat — not actually a gradient now).
 * variant: 'primary' (solid blue) | 'ghost' (outlined) | 'plain' (text only)
 * size: 'md' | 'lg' | 'pill'
 */
function GradientButton({
  title, children, onPress, icon, loading, disabled,
  variant = 'primary', size = 'md', style, fullWidth = true,
}) {
  const theme = useTheme();
  const s = makeStyles(theme, size, variant, fullWidth);

  const content = (
    <View style={s.content}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.colors.primary} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={variant === 'primary' ? '#fff' : theme.colors.primary}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={s.text}>{title || children}</Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.wrap, pressed && s.pressed, disabled && { opacity: 0.4 }, style]}
    >
      {content}
    </Pressable>
  );
}

const makeStyles = (t, size, variant, fullWidth) => {
  const height = size === 'lg' ? 50 : size === 'pill' ? 36 : 44;
  const radius = size === 'pill' ? t.borderRadius.full : 10;
  const bg =
    variant === 'primary' ? t.colors.primary :
    variant === 'ghost'   ? 'transparent'    :
    'transparent';
  const textColor =
    variant === 'primary' ? '#fff' : t.colors.primary;
  return StyleSheet.create({
    wrap: {
      height, borderRadius: radius,
      backgroundColor: bg,
      borderWidth: variant === 'ghost' ? 1 : 0,
      borderColor: t.colors.primary,
      justifyContent: 'center', paddingHorizontal: 20,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    },
    pressed: { opacity: 0.6 },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    text: {
      color: textColor,
      fontFamily: t.typography.fontSemiBold,
      fontSize: size === 'lg' ? 17 : 15,
      letterSpacing: -0.2,
    },
  });
};

export default memo(GradientButton);
