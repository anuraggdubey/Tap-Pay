/**
 * GlassSurface — "liquid glass" panel: translucent fill, soft specular sheen on the
 * top-left, bright 1px rim, rounded continuous corners. Sits on AmbientBackground so
 * the glass has color to pick up.
 */

import React, {useRef} from 'react';
import {Platform, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useTheme} from '../context/ThemeContext';

let uid = 0;

type Props = {
  radius?: number;
  /** 1 = default; higher = more opaque glass (sheets, tab bar). */
  strength?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function GlassSurface({radius = 24, strength = 1, style, children}: Props) {
  const {isDark} = useTheme();
  const id = useRef(`glass${++uid}`).current;

  const fill = isDark
    ? `rgba(255,255,255,${(0.08 * strength).toFixed(3)})`
    : `rgba(255,255,255,${Math.min(0.92, 0.62 * strength).toFixed(3)})`;
  const rim = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.95)';
  const sheenTop = isDark ? 0.2 : 0.55;

  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: fill,
          borderWidth: 1,
          borderColor: rim,
          overflow: 'hidden',
        },
        !isDark &&
          Platform.select({
            ios: {
              shadowColor: '#1C2A4A',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: {width: 0, height: 8},
            },
            android: {elevation: 3},
            default: {},
          }),
        style,
      ]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0.9" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={sheenTop} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.03} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}
