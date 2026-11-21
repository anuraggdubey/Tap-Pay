/**
 * Gradient primitives built on react-native-svg (no extra native gradient lib).
 * - GradientFill: linear gradient background that fills its parent.
 * - RippleRings: the TapPay signature concentric "tap ripple" motif.
 */

import React, {useRef} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

let uid = 0;
const useUid = () => {
  const ref = useRef<number | undefined>(undefined);
  if (ref.current === undefined) {
    uid += 1;
    ref.current = uid;
  }
  return `g${ref.current}`;
};

type Glow = {color: string; opacity?: number; cx: number; cy: number; r: number};

type FillProps = {
  colors: string[];
  /** Degrees, 0 = left to right, 90 = top to bottom. */
  angle?: number;
  glows?: Glow[];
  style?: StyleProp<ViewStyle>;
};

export function GradientFill({colors, angle = 135, glows = [], style}: FillProps) {
  const id = useUid();
  const rad = (angle * Math.PI) / 180;
  const x1 = 0.5 - Math.cos(rad) / 2;
  const y1 = 0.5 - Math.sin(rad) / 2;
  const x2 = 0.5 + Math.cos(rad) / 2;
  const y2 = 0.5 + Math.sin(rad) / 2;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${id}l`} x1={x1} y1={y1} x2={x2} y2={y2}>
            {colors.map((c, i) => (
              <Stop
                key={c + i}
                offset={colors.length === 1 ? 0 : i / (colors.length - 1)}
                stopColor={c}
              />
            ))}
          </LinearGradient>
          {glows.map((g, i) => (
            <RadialGradient
              key={i}
              id={`${id}r${i}`}
              cx={g.cx}
              cy={g.cy}
              r={g.r}
              fx={g.cx}
              fy={g.cy}>
              <Stop offset="0" stopColor={g.color} stopOpacity={g.opacity ?? 0.5} />
              <Stop offset="1" stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}l)`} />
        {glows.map((g, i) => (
          <Rect key={i} width="100%" height="100%" fill={`url(#${id}r${i})`} />
        ))}
      </Svg>
    </View>
  );
}

type RippleProps = {
  size?: number;
  color?: string;
  opacity?: number;
  rings?: number;
  style?: StyleProp<ViewStyle>;
};

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
              strokeWidth={1.2}
              fill="none"
            />
          );
        })}
      </Svg>
    </View>
  );
}
