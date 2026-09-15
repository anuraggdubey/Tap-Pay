/**
 * BrandLogo — Freestanding, unboxed TapPay brand emblem
 * High-resolution vector/render asset without any circular or square container box.
 */

import React from 'react';
import {View, Image, Text, StyleSheet, ViewStyle} from 'react-native';

interface Props {
  size?: number;
  showWordmark?: boolean;
  style?: ViewStyle;
}

export default function BrandLogo({size = 48, showWordmark = false, style}: Props) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/tappay_logo.png')}
        style={{width: size, height: size}}
        resizeMode="contain"
      />
      {showWordmark && (
        <View style={styles.wordmarkContainer}>
          <Text style={styles.brandTitle}>TapPay</Text>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>MONAD</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  pillBadge: {
    backgroundColor: 'rgba(110, 84, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(110, 84, 255, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    color: '#A290FB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
