import React, { forwardRef, memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { hap } from '../utils/haptics';

/**
 * Animated pressable that scales down on press + fires haptic feedback.
 * Default haptic is 'light'. Pass hapticStyle={null} to disable.
 */
function PressableScale({
  children,
  onPress,
  style,
  disabled,
  hapticStyle = 'light',
  minScale = 0.97,
  hitSlop,
  accessibilityLabel,
}, ref) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(minScale, { mass: 0.6, damping: 14, stiffness: 180 });
  }, [minScale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 180, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  }, []);

  const handlePress = useCallback((e) => {
    if (hapticStyle && hap[hapticStyle]) hap[hapticStyle]();
    onPress?.(e);
  }, [onPress, hapticStyle]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        ref={ref}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityLabel={accessibilityLabel}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default memo(forwardRef(PressableScale));
