/**
 * LivePulseDot — Soft status pulse (state indication for NFC ready).
 * Subtle, continuous; opacity-only under reduced motion.
 */

import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, StyleSheet, View} from 'react-native';
import {colors} from '../theme';

type Props = {
  active?: boolean;
  color?: string;
  size?: number;
};

export default function LivePulseDot({
  active = true,
  color = colors.success,
  size = 7,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduced(enabled);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!active || reduced) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduced, pulse]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.45, 0.25, 0],
  });

  return (
    <View style={[styles.wrap, {width: size * 2.2, height: size * 2.2}]}>
      {active && !reduced && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              transform: [{scale: ringScale}],
              opacity: ringOpacity,
            },
          ]}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? color : colors.textMuted,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
});
