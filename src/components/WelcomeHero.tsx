/**
 * WelcomeHero — onboarding hero: two phones touching with ripples between
 * them, plus a rotating one-line pitch. Pure UI.
 */

import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {GradientFill, RippleRings} from './Gradient';
import {ContactlessWave} from './AppIcons';

const LINES = [
  'No addresses to copy.',
  'Your keys never leave this phone.',
  'Works with @usernames too.',
];

function Phone({side, colors}: {side: 'left' | 'right'; colors: string[]}) {
  const tilt = side === 'left' ? '-12deg' : '12deg';
  return (
    <View
      style={[
        s.phone,
        side === 'left' ? s.phoneLeft : s.phoneRight,
        {transform: [{rotate: tilt}]},
      ]}>
      <View style={s.screen}>
        <GradientFill colors={colors} angle={160} />
        <View style={s.notch} />
        <View style={s.screenChip}>
          <ContactlessWave size={22} color="#FFFFFF" />
        </View>
        <View style={s.screenBar} />
        <View style={[s.screenBar, {width: '40%', opacity: 0.5}]} />
      </View>
    </View>
  );
}

export default function WelcomeHero() {
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [line, setLine] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const a = Animated.loop(
      Animated.timing(pulse, {toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true}),
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(float, {toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pulse, float, reduced]);

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(fade, {toValue: 0, duration: 220, useNativeDriver: true}).start(() => {
        setLine(l => (l + 1) % LINES.length);
        Animated.timing(fade, {toValue: 1, duration: 280, useNativeDriver: true}).start();
      });
    }, 3200);
    return () => clearInterval(id);
  }, [fade]);

  const ring = (offset: number) => {
    const p = Animated.modulo(Animated.add(pulse, offset), 1);
    return (
      <Animated.View
        key={offset}
        pointerEvents="none"
        style={[
          s.pulseRing,
          {
            opacity: p.interpolate({inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0]}),
            transform: [{scale: p.interpolate({inputRange: [0, 1], outputRange: [0.3, 2.6]})}],
          },
        ]}
      />
    );
  };

  const lift = float.interpolate({inputRange: [0, 1], outputRange: [0, -8]});

  return (
    <View style={s.wrap}>
      <RippleRings size={420} color="#7FA6FF" opacity={0.2} rings={7} style={s.bgRipple} />
      <Animated.View style={[s.phones, {transform: [{translateY: lift}]}]}>
        {!reduced && [0, 0.5].map(ring)}
        <Phone side="left" colors={['#2B5BE8', '#6D4DFF']} />
        <Phone side="right" colors={['#14B8A6', '#3D7BFF']} />
      </Animated.View>
      <Text style={s.headline}>
        Tap phones.{'\n'}
        <Text style={s.headlineAccent}>Money moves.</Text>
      </Text>
      <Animated.Text style={[s.line, {opacity: fade}]}>{LINES[line]}</Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  bgRipple: {position: 'absolute', top: -20},
  phones: {width: 260, height: 230, alignItems: 'center', justifyContent: 'center', marginBottom: 28},
  pulseRing: {position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderColor: '#7FA6FF'},
  phone: {
    position: 'absolute',
    width: 104,
    height: 196,
    borderRadius: 26,
    padding: 5,
    backgroundColor: '#1C1F27',
    borderWidth: 1,
    borderColor: '#343A47',
    shadowColor: '#3D7BFF',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 12},
    elevation: 10,
  },
  phoneLeft: {left: 28},
  phoneRight: {right: 28},
  screen: {flex: 1, borderRadius: 21, overflow: 'hidden', padding: 10, justifyContent: 'flex-end', gap: 6},
  notch: {position: 'absolute', top: 8, alignSelf: 'center', width: 26, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.45)'},
  screenChip: {width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 8},
  screenBar: {height: 6, width: '70%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)'},
  headline: {fontSize: 40, fontWeight: '800', color: '#F4F5F7', textAlign: 'center', letterSpacing: -1.6, lineHeight: 44},
  headlineAccent: {color: '#7FA6FF'},
  line: {marginTop: 14, fontSize: 15, color: '#8B91A0', textAlign: 'center'},
});
