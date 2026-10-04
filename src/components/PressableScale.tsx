/**
 * PressableScale — Instant press feedback (Apple: respond on pointer-down).
 * scale 0.97 in ~110ms ease-out. Feedback purpose only — used tens of times/day.
 */

import React, {useCallback, useRef} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import {motion} from '../theme';

type Props = {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  hitSlop?: number | {top?: number; bottom?: number; left?: number; right?: number};
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
  accessibilityState?: {selected?: boolean; disabled?: boolean};
  testID?: string;
  scaleTo?: number;
};

const EASE_OUT = Easing.bezier(
  motion.easeOut.x1,
  motion.easeOut.y1,
  motion.easeOut.x2,
  motion.easeOut.y2,
);

export default function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  contentStyle,
  hitSlop = 4,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  testID,
  scaleTo = motion.pressScale,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (to: number, duration: number) => {
      Animated.timing(scale, {
        toValue: to,
        duration,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (!disabled) {
          animateTo(scaleTo, motion.pressMs);
        }
      }}
      onPressOut={() => animateTo(1, motion.pressMs + 20)}
      hitSlop={hitSlop}
      pressRetentionOffset={12}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
      style={style}>
      <Animated.View
        style={[
          // Do not force flex:1 — that collapses height (and hides labels)
          // when the parent has no explicit size (e.g. segmented controls).
          contentStyle,
          {transform: [{scale}], opacity: disabled ? 0.45 : 1},
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
