import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/theme';

/**
 * iOS-style top bar. Solid background, hairline divider, no blur.
 * Three-zone: back / center (title or custom) / trailing icon.
 */
function BlurHeader({
  title, onBack, backIcon = 'chevron-back',
  trailing, subtitle, center, large = false,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme, large);

  return (
    <View style={[s.wrap, { paddingTop: insets.top || 44 }]}>
      <View style={s.row}>
        <View style={s.side}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
              <Ionicons name={backIcon} size={28} color={theme.colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={s.center}>
          {center ? center : (
            <>
              {title && <Text style={s.title} numberOfLines={1}>{title}</Text>}
              {subtitle && <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
            </>
          )}
        </View>

        <View style={[s.side, { alignItems: 'flex-end' }]}>
          {trailing && trailing.icon && (
            <Pressable onPress={trailing.onPress} hitSlop={12} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
              <Ionicons name={trailing.icon} size={24} color={theme.colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t, large) => StyleSheet.create({
  wrap: {
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.hairline,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10, minHeight: 44,
  },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: large ? 'flex-start' : 'center' },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: large ? 28 : 17,
    color: t.colors.text,
    letterSpacing: large ? -0.5 : -0.2,
  },
  subtitle: {
    fontFamily: t.typography.fontRegular,
    fontSize: 13, color: t.colors.textMuted, marginTop: 1,
  },
});

export default memo(BlurHeader);
