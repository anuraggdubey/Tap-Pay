/**
 * BrandLogo — official TapPay mark (transparent asset).
 * On accent/dark surfaces keep natural white+gray; pass `color` to tint on light UIs.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ImageStyle,
} from 'react-native';

const LOGO = require('../assets/tappay-logo.png');

interface Props {
  size?: number;
  showWordmark?: boolean;
  /** Tint the mark (use on light backgrounds). Omit / white keeps original white+gray. */
  color?: string;
  style?: ViewStyle;
  /** When true, force natural mark colors even if `color` is set */
  natural?: boolean;
}

export default function BrandLogo({
  size = 40,
  showWordmark = false,
  color = '#FFFFFF',
  style,
  natural = false,
}: Props) {
  const s = size;
  const useNatural =
    natural ||
    !color ||
    color.toUpperCase() === '#FFFFFF' ||
    color.toUpperCase() === '#FFF';

  const imageStyle: StyleProp<ImageStyle> = [
    {width: s, height: s},
    !useNatural ? {tintColor: color} : null,
  ];

  return (
    <View style={[styles.container, style]}>
      <Image
        source={LOGO}
        style={imageStyle}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="TapPay"
      />

      {showWordmark && (
        <View style={styles.wordmarkContainer}>
          <Text style={[styles.brandTitle, {color: useNatural ? '#FFFFFF' : color}]}>
            TapPay
          </Text>
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
