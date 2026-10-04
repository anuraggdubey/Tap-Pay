/**
 * FadeInView — Mount entrance: opacity + slight translateY (preventing jarring change).
 * Never scale(0). Respects prefers-reduced-motion via AccessibilityInfo.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {motion} from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  translateY?: number;
};

const EASE_OUT = Easing.bezier(
  motion.easeOut.x1,
  motion.easeOut.y1,
  motion.easeOut.x2,
  motion.easeOut.y2,
);

export default function FadeInView({
  children,
  style,
  delay = 0,
  duration = motion.enterMs,
  translateY = 10,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(translateY)).current;
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
    if (reduced) {
      opacity.setValue(1);
      y.setValue(0);
      return;
    }

    opacity.setValue(0);
    y.setValue(translateY);

    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: 0,
        duration,
        delay,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduced, delay, duration, translateY, opacity, y]);

  return (
    <Animated.View style={[style, {opacity, transform: [{translateY: y}]}]}>
      {children}
    </Animated.View>
  );
}
