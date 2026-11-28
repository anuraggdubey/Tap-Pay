/**
 * WalletCardStack — the home screen's fan of three wallet cards: AUSD, MON and Tap to Pay.
 * One card sits in front and the other two peek out on each side. Tap a side card, or swipe
 * the stack left or right, and it slides to the front. Pure artwork drawn with
 * react-native-svg gradients (no image assets), same look in light and dark mode.
 * Respects the system reduce-motion setting.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {ContactlessMark} from './OnboardingIcons';
import {triggerHaptic} from '../utils/haptics';

let uid = 0;

export type CardKey = 'ausd' | 'mon' | 'tap';
export const CARD_ORDER: CardKey[] = ['ausd', 'mon', 'tap'];
const CARD_NAMES: Record<CardKey, string> = {ausd: 'AUSD card', mon: 'MON card', tap: 'Tap to Pay card'};

type Face = {
  from: string;
  mid: string;
  to: string;
  glow: number;
};

const FACES: Record<CardKey, Face> = {
  ausd: {from: '#1C2F86', mid: '#2563EB', to: '#3FC1F5', glow: 0.38},
  mon: {from: '#2E1065', mid: '#6D28D9', to: '#C084FC', glow: 0.3},
  tap: {from: '#1F1F24', mid: '#4B4B55', to: '#9C9CA8', glow: 0.32},
};

/** Where a card sits relative to the front one: -1 left, 0 front, 1 right. */
export function slotOf(index: number, front: number): number {
  return ((index - front + 4) % 3) - 1;
}

function CardArt({face, width, height, radius}: {face: Face; width: number; height: number; radius: number}) {
  const id = useRef(`card${++uid}`).current;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={face.from} />
          <Stop offset="0.55" stopColor={face.mid} />
          <Stop offset="1" stopColor={face.to} />
        </LinearGradient>
        <RadialGradient id={`${id}r`} cx="18%" cy="0%" r="75%" fx="18%" fy="0%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={face.glow} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} rx={radius} fill={`url(#${id}l)`} />
      <Rect width={width} height={height} rx={radius} fill={`url(#${id}r)`} />
      <Circle cx={width * 1.02} cy={height * 1.05} r={height * 0.55} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={1.2} fill="none" />
      <Circle cx={width * 1.02} cy={height * 1.05} r={height * 0.8} stroke="#FFFFFF" strokeOpacity={0.09} strokeWidth={1.2} fill="none" />
      <Circle cx={width * 1.02} cy={height * 1.05} r={height * 1.05} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={1.2} fill="none" />
      <Rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={radius - 0.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} />
    </Svg>
  );
}

type Props = {
  /** Shown on each card: @username or a short address. */
  holder: string;
  width: number;
  /** Formatted balances shown on the AUSD and MON cards. */
  ausd: string;
  mon: string;
  /** Hide the balances (the home screen's eye button). */
  hidden?: boolean;
  /** Called when a different card comes to the front. */
  onChange?: (card: CardKey) => void;
};

export default function WalletCardStack({holder, width, ausd, mon, hidden, onChange}: Props) {
  const [front, setFront] = useState(0);
  const [reduced, setReduced] = useState(false);

  const frontW = Math.min(236, Math.round(width * 0.62));
  const frontH = Math.round(frontW * 0.63);
  const backScale = 0.66;
  const backW = frontW * backScale;
  const peek = Math.round(backW * 0.42);
  // Distance from the centre of the stack to a side card's centre.
  const sideX = frontW / 2 + peek - backW / 2;
  const height = frontH + 24;

  const slots = useRef(CARD_ORDER.map((_, i) => new Animated.Value(slotOf(i, 0)))).current;
  const drag = useRef(new Animated.Value(0)).current;
  const frontRef = useRef(front);
  frontRef.current = front;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(enabled => {
        if (mounted) {
          setReduced(!!enabled);
        }
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    const anims = slots.map((v, i) => {
      const to = slotOf(i, front);
      if (reduced) {
        return Animated.timing(v, {toValue: to, duration: 0, useNativeDriver: true});
      }
      return Animated.spring(v, {toValue: to, damping: 18, stiffness: 180, mass: 0.9, useNativeDriver: true});
    });
    Animated.parallel(anims).start();
  }, [front, reduced, slots]);

  const bringToFront = (index: number) => {
    if (index === frontRef.current) {
      return;
    }
    triggerHaptic.selection();
    setFront(index);
    onChange?.(CARD_ORDER[index]);
  };
  const bringRef = useRef(bringToFront);
  bringRef.current = bringToFront;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => drag.setValue(g.dx * 0.35),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 40 || Math.abs(g.vx) > 0.4) {
            // Swipe left brings the right-hand card forward, swipe right the left-hand one.
            const dir = g.dx < 0 ? 1 : -1;
            bringRef.current((frontRef.current + dir + 3) % 3);
          }
          Animated.spring(drag, {toValue: 0, damping: 20, stiffness: 220, useNativeDriver: true}).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, {toValue: 0, useNativeDriver: true}).start();
        },
      }),
    [drag],
  );

  const amountFor = (key: CardKey) => {
    if (key === 'tap') {
      return 'Hold to pay';
    }
    if (hidden) {
      return '••••';
    }
    return key === 'ausd' ? `${ausd} AUSD` : `${mon} MON`;
  };

  return (
    <View style={{width, height}} {...pan.panHandlers}>
      <Animated.View style={[StyleSheet.absoluteFill, {transform: [{translateX: drag}]}]}>
        {CARD_ORDER.map((key, i) => {
          const slot = slots[i];
          const isFront = i === front;
          return (
            <Animated.View
              key={key}
              style={[
                s.card,
                isFront ? s.frontCard : s.backCard,
                {
                  width: frontW,
                  height: frontH,
                  left: width / 2 - frontW / 2,
                  transform: [
                    {translateX: slot.interpolate({inputRange: [-1, 0, 1], outputRange: [-sideX, 0, sideX]})},
                    {
                      scale: slot.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [backScale, 1, backScale],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}>
              <Pressable
                style={s.fill}
                onPress={() => bringToFront(i)}
                accessibilityRole="button"
                accessibilityLabel={CARD_NAMES[key]}
                accessibilityHint={isFront ? undefined : 'Brings this card to the front'}
                accessibilityState={{selected: isFront}}>
                <CardArt face={FACES[key]} width={frontW} height={frontH} radius={18} />
                <View style={s.content}>
                  <View style={s.row}>
                    <View style={s.brand}>
                      <ContactlessMark size={17} color="#FFFFFF" />
                      <Text style={s.brandText}>{key === 'tap' ? 'Tap to Pay' : 'TapPay'}</Text>
                    </View>
                    <Text style={s.token}>{key === 'tap' ? 'NFC' : key.toUpperCase()}</Text>
                  </View>
                  <View style={s.row}>
                    <Text style={s.holder} numberOfLines={1}>
                      {holder}
                    </Text>
                    <Text style={s.amount} numberOfLines={1}>
                      {amountFor(key)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>
      <View style={[s.dots, {top: frontH + 16}]} pointerEvents="none">
        {CARD_ORDER.map((key, i) => (
          <View key={key} style={[s.dot, i === front && s.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {position: 'absolute', top: 6, borderRadius: 18, overflow: 'hidden'},
  frontCard: {
    zIndex: 3,
    ...Platform.select({
      ios: {shadowColor: '#0B1F5C', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: {width: 0, height: 10}},
      android: {elevation: 10},
      default: {},
    }),
  },
  backCard: {
    zIndex: 1,
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: {width: 0, height: 4}},
      android: {elevation: 3},
      default: {},
    }),
  },
  fill: {flex: 1},
  content: {flex: 1, padding: 14, justifyContent: 'space-between'},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 6},
  brandText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2},
  token: {fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6},
  holder: {flexShrink: 1, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2},
  amount: {fontSize: 13, fontWeight: '700', color: '#FFFFFF'},
  dots: {position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6},
  dot: {width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(142,142,147,0.45)'},
  dotOn: {width: 16, backgroundColor: '#3B82F6'},
});
