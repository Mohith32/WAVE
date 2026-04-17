import React, { memo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../utils/theme';

/**
 * Plain solid background screen container. Name kept for compatibility
 * with existing imports — no more ambient effects.
 */
function AmbientBackground({ children, style }) {
  const theme = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>
      {children}
    </View>
  );
}

export default memo(AmbientBackground);
