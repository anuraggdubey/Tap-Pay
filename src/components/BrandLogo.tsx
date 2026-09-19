/**
 * BrandLogo — Minimalist, unboxed, freestanding TapPay emblem
 * Inspired by modern decentralized tech identities (Fuse / Monad / Apple).
 * Pure geometry, crisp lines, zero container boxes, zero emojis.
 */

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';

interface Props {
  size?: number;
  showWordmark?: boolean;
  color?: string;
  style?: ViewStyle;
}

export default function BrandLogo({
  size = 40,
  showWordmark = false,
  color = '#FFFFFF',
  style,
}: Props) {
  const s = size;
  const dotBig = s * 0.38;
  const dotSmall = s * 0.26;

  return (
    <View style={[styles.container, style]}>
      {/* Freestanding Interconnected Node Emblem */}
      <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
        {/* Top Node */}
        <View
          style={{
            position: 'absolute',
            top: s * 0.08,
            left: s * 0.16,
            width: dotBig,
            height: dotBig,
            borderRadius: dotBig / 2,
            backgroundColor: color,
          }}
        />
        {/* Curved connecting bridge */}
        <View
          style={{
            position: 'absolute',
            top: s * 0.28,
            left: s * 0.32,
            width: s * 0.38,
            height: s * 0.38,
            borderRadius: s * 0.19,
            borderWidth: s * 0.14,
            borderColor: color,
            borderLeftColor: 'transparent',
            borderTopColor: 'transparent',
            transform: [{rotate: '15deg'}],
          }}
        />
        {/* Bottom Right Node */}
        <View
          style={{
            position: 'absolute',
            bottom: s * 0.08,
            right: s * 0.14,
            width: dotBig,
            height: dotBig,
            borderRadius: dotBig / 2,
            backgroundColor: color,
          }}
        />
        {/* Orbit Satellite Node (Contactless Tap indicator) */}
        <View
          style={{
            position: 'absolute',
            top: s * 0.18,
            right: s * 0.1,
            width: dotSmall,
            height: dotSmall,
            borderRadius: dotSmall / 2,
            backgroundColor: color,
            opacity: 0.85,
          }}
        />
      </View>

      {showWordmark && (
        <View style={styles.wordmarkContainer}>
          <Text style={[styles.brandTitle, {color}]}>TapPay</Text>
          <View style={styles.networkBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.networkText}>MONAD</Text>
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
    letterSpacing: -0.8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#30D158',
  },
  networkText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
