/**
 * WalletCardStack — the home screen's fan of three wallet cards: the TapPay AUSD card in
 * front, the MON card and the tap-to-pay card peeking out behind it. Pure artwork drawn
 * with react-native-svg gradients (no image assets), same look in light and dark mode.
 */

import React, {useRef} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {ContactlessMark} from './OnboardingIcons';

let uid = 0;

type Face = {
  from: string;
  mid: string;
  to: string;
  glow: number;
};

const FRONT: Face = {from: '#1C2F86', mid: '#2563EB', to: '#3FC1F5', glow: 0.38};
const MON: Face = {from: '#2E1065', mid: '#6D28D9', to: '#C084FC', glow: 0.3};
const TAP: Face = {from: '#1F1F24', mid: '#4B4B55', to: '#9C9CA8', glow: 0.32};

function CardArt({face, width, height, radius, waves}: {face: Face; width: number; height: number; radius: number; waves?: boolean}) {
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
      {waves ? (
        <>
          <Circle cx={width * 1.02} cy={height * 1.05} r={height * 0.55} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={1.2} fill="none" />
          <Circle cx={width * 1.02} cy={height * 1.05} r={height * 0.8} stroke="#FFFFFF" strokeOpacity={0.09} strokeWidth={1.2} fill="none" />
          <Circle cx={width * 1.02} cy={height * 1.05} r={height * 1.05} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={1.2} fill="none" />
        </>
      ) : null}
      <Rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={radius - 0.5}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.22}
      />
    </Svg>
  );
}

type Props = {
  /** Shown on the front card: @username or a short address. */
  holder: string;
  width: number;
};

export default function WalletCardStack({holder, width}: Props) {
  const frontW = Math.min(236, Math.round(width * 0.62));
  const frontH = Math.round(frontW * 0.63);
  const backW = Math.round(frontW * 0.66);
  const backH = Math.round(backW * 0.63);
  const peek = Math.round(backW * 0.42);
  const height = frontH + 12;
  const center = width / 2;

  return (
    <View style={{width, height}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[s.card, s.back, {width: backW, height: backH, left: center - frontW / 2 - peek, top: (height - backH) / 2}]}>
        <CardArt face={MON} width={backW} height={backH} radius={12} />
        <Text style={s.backLabel}>MON</Text>
      </View>
      <View style={[s.card, s.back, {width: backW, height: backH, left: center + frontW / 2 + peek - backW, top: (height - backH) / 2}]}>
        <CardArt face={TAP} width={backW} height={backH} radius={12} />
        <View style={s.backMark}>
          <ContactlessMark size={16} color="#FFFFFF" />
        </View>
      </View>
      <View style={[s.card, s.front, {width: frontW, height: frontH, left: center - frontW / 2}]}>
        <CardArt face={FRONT} width={frontW} height={frontH} radius={18} waves />
        <View style={s.frontTop}>
          <View style={s.brand}>
            <ContactlessMark size={17} color="#FFFFFF" />
            <Text style={s.brandText}>TapPay</Text>
          </View>
          <Text style={s.token}>AUSD</Text>
        </View>
        <Text style={s.holder} numberOfLines={1}>
          {holder}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {position: 'absolute', overflow: 'hidden'},
  back: {
    borderRadius: 12,
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: {width: 0, height: 4}},
      android: {elevation: 3},
      default: {},
    }),
  },
  front: {
    borderRadius: 18,
    top: 6,
    padding: 14,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {shadowColor: '#0B1F5C', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: {width: 0, height: 10}},
      android: {elevation: 10},
      default: {},
    }),
  },
  frontTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 6},
  brandText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2},
  token: {fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6},
  holder: {fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2},
  backLabel: {position: 'absolute', top: 9, left: 10, fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6},
  backMark: {position: 'absolute', top: 8, right: 9},
});
