/**
 * SuccessBurst — payment-complete celebration.
 * Gradient disc springs in, check mark draws itself, three ripple rings expand
 * and a ring of particles flies outward. Plays once on mount.
 * Sound + haptic are triggered by the caller via `onStart` so they fire once.
 */

import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  size?: number;
  colors?: [string, string];
  reduced?: boolean;
  onStart?: () => void;
};

const PARTICLES = 0;

export default function SuccessBurst({
  size = 120,
  colors = ['#30D158', '#30D158'],
  reduced = false,
  onStart,
}: Props) {
  const disc = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const check = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const burst = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    onStart?.();
    if (reduced) {
      return;
    }
    Animated.sequence([
      Animated.spring(disc, {toValue: 1, friction: 6, tension: 90, useNativeDriver: true}),
      Animated.parallel([
        Animated.timing(check, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(burst, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [disc, check, burst, reduced, onStart]);

  const stage = size * 2.6;
  const dash = 60;
  const strokeDashoffset = check.interpolate({inputRange: [0, 1], outputRange: [dash, 0]});

  const particles = useMemo(
    () =>
      Array.from({length: PARTICLES}).map((_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
        const dist = size * (0.95 + (i % 3) * 0.18);
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          r: 3 + (i % 3),
          color: i % 3 === 0 ? colors[0] : i % 3 === 1 ? '#7FA6FF' : '#FFFFFF',
        };
      }),
    [size, colors],
  );

  return (
    <View style={{width: stage, height: stage, alignItems: 'center', justifyContent: 'center'}}>
      {[0, 0.25].map((d, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: colors[0],
            opacity: burst.interpolate({
              inputRange: [d, d + 0.15, 1],
              outputRange: [0, 0.55, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                scale: burst.interpolate({
                  inputRange: [d, 1],
                  outputRange: [1, 2.4],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}
        />
      ))}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: p.r * 2,
            height: p.r * 2,
            borderRadius: p.r,
            backgroundColor: p.color,
            opacity: burst.interpolate({inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.6, 0]}),
            transform: [
              {translateX: burst.interpolate({inputRange: [0, 1], outputRange: [0, p.dx]})},
              {translateY: burst.interpolate({inputRange: [0, 1], outputRange: [0, p.dy]})},
              {scale: burst.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]})},
            ],
          }}
        />
      ))}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          transform: [{scale: disc}],
          opacity: disc,
        }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="sb" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#sb)" />
          <AnimatedPath
            d="M30 52 L44 66 L71 36"
            stroke="#FFFFFF"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={dash}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

export const successBurstStyles = StyleSheet.create({});
