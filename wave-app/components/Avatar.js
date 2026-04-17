import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../utils/theme';

const COLORS = ['#E17076', '#E4A561', '#5BBA9F', '#5A9EF0', '#9988D9', '#DE7BB5', '#52A8B8', '#A58E58'];

export const getAvatarColor = (name) => {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

function Avatar({ name, size = 48, borderRadius, showOnline = false, online = false }) {
  const theme = useTheme();
  const bg = getAvatarColor(name);
  const initial = name?.charAt(0).toUpperCase() || '?';
  const br = borderRadius ?? size / 2;
  const fontSize = size * 0.42;
  const dotSize = Math.max(size * 0.28, 10);

  return (
    <View style={[s.wrapper, { width: size, height: size }]}>
      <View style={[s.avatar, { width: size, height: size, borderRadius: br, backgroundColor: bg }]}>
        <Text style={[s.initial, { fontSize }]}>{initial}</Text>
      </View>
      {showOnline && online && (
        <View
          style={[
            s.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: theme.colors.online,
              borderColor: theme.colors.surface,
              bottom: 0,
              right: 0,
              borderWidth: 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { position: 'relative' },
  avatar: { justifyContent: 'center', alignItems: 'center' },
  initial: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  dot: { position: 'absolute' },
});

export default memo(Avatar);
