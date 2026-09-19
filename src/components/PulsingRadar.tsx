/**
 * PulsingRadar Component
 *
 * Apple Pay-style pulsing wave radar animation for NFC Tap Pay screens.
 * Features 3 staggered concentric rings radiating outwards with smooth scale and opacity interpolation,
 * with a completely unboxed, freestanding contactless radio glyph.
 */

import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';

interface PulsingRadarProps {
  label?: string; // e.g. "SEND", "RECEIVE"
  color?: string; // Accent color (default: Monad Purple #836EF9)
  size?: number; // Center icon diameter (default: 90)
  active?: boolean;
}

export const PulsingRadar: React.FC<PulsingRadarProps> = ({
  label = 'NFC',
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
      outputRange: [0, 0.35, 0.1, 0],
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

      {/* Center freestanding contactless symbol — unboxed, no circular container */}
      <View style={[styles.centerFreestanding, {width: size, height: size}]}>
        <View style={styles.contactlessContainer}>
          <View style={[styles.arcOuter, {borderColor: color}]} />
          <View style={[styles.arcMid, {borderColor: color}]} />
          <View style={[styles.arcInner, {borderColor: color}]} />
          <View style={[styles.arcDot, {backgroundColor: color}]} />
        </View>
        <Text style={[styles.labelText, {color}]}>{label}</Text>
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
    borderWidth: 1.5,
  },
  centerFreestanding: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  contactlessContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  arcOuter: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{rotate: '-45deg'}],
  },
  arcMid: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{rotate: '-45deg'}],
  },
  arcInner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{rotate: '-45deg'}],
  },
  arcDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    left: 10,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
