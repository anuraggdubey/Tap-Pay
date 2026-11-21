/**
 * Fill + ripple primitives (react-native-svg).
 * GradientFill intentionally renders a SOLID fill (first color): the app follows
 * the Apple Pay look, which has no gradients. Kept so call sites stay simple.
 */

import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

type FillProps = {
  colors: string[];
  angle?: number;
  glows?: unknown[];
  style?: StyleProp<ViewStyle>;
};

export function GradientFill({colors, style}: FillProps) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {backgroundColor: colors[0]}, style]}
    />
  );
}

type RippleProps = {
  size?: number;
  color?: string;
  opacity?: number;
  rings?: number;
  style?: StyleProp<ViewStyle>;
};

/** Thin concentric rings — used only on the NFC / empty-state illustrations. */
export function RippleRings({
  size = 220,
  color = '#FFFFFF',
  opacity = 0.16,
  rings = 5,
  style,
}: RippleProps) {
  const c = size / 2;
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={size} height={size}>
        {Array.from({length: rings}).map((_, i) => {
          const r = (c / rings) * (i + 1) - 1;
          return (
            <Circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              stroke={color}
              strokeOpacity={opacity * (1 - i / (rings + 1))}
              strokeWidth={1}
              fill="none"
            />
          );
        })}
      </Svg>
    </View>
  );
}
