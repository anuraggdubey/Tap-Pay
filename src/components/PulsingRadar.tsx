/**
 * PulsingRadar Component
 *
 * Apple Pay-style pulsing wave radar animation for NFC Tap Pay screens.
 * Features 3 staggered concentric rings radiating outwards with smooth scale and opacity interpolation.
 */

import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';

interface PulsingRadarProps {
  icon?: string;
  color?: string; // Accent color (default: Monad Purple #836EF9)
  size?: number; // Center icon diameter (default: 90)
  active?: boolean;
}

export const PulsingRadar: React.FC<PulsingRadarProps> = ({
  icon = '📡',
  color = '#836EF9',
  size = 90,
  active = true,
}) => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim1.setValue(0);
      anim2.setValue(0);
      anim3.setValue(0);
      return;
    }

    const createPulse = (animVal: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animVal, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(animVal, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const pulse1 = createPulse(anim1, 0);
    const pulse2 = createPulse(anim2, 800);
    const pulse3 = createPulse(anim3, 1600);

    pulse1.start();
    pulse2.start();
    pulse3.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
    };
  }, [active, anim1, anim2, anim3]);

  const renderWave = (animVal: Animated.Value) => {
    const scale = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.6],
    });

    const opacity = animVal.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 0.45, 0.15, 0],
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wave,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            transform: [{scale}],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, {width: size * 2.8, height: size * 2.8}]}>
      {active && (
        <>
          {renderWave(anim1)}
          {renderWave(anim2)}
          {renderWave(anim3)}
        </>
      )}

      {/* Center glowing badge */}
      <View
        style={[
          styles.centerBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `${color}25`,
            borderColor: `${color}88`,
          },
        ]}>
        <Text style={[styles.iconText, {fontSize: size * 0.42}]}>{icon}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    borderWidth: 2,
  },
  centerBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconText: {
    textAlign: 'center',
  },
});
