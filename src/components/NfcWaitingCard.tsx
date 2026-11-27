/**
 * NfcWaitingCard — full-screen NFC send/receive state screen.
 * Animated radar (expanding rings + rotating scanner arc + gradient core),
 * with sound + haptic cues when the state changes. Pure UI; no NFC / payment logic.
 */

import React, {useEffect, useMemo, useRef} from 'react';
import {AccessibilityInfo, Animated, Easing, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ContactlessWave, CrossIcon, ReceiveTapIcon} from './AppIcons';
import PressableScale from './PressableScale';
import {GradientFill} from './Gradient';
import AmbientBackground from './AmbientBackground';
import SuccessBurst from './SuccessBurst';
import {useTheme} from '../context/ThemeContext';
import {triggerHaptic} from '../utils/haptics';
import {playSound} from '../utils/sounds';
import type {AppColors} from '../theme';

type NfcPhaseVisual = 'searching' | 'broadcasting' | 'success' | 'failed' | 'expired' | 'received';

type Props = {
  accent?: 'purple' | 'green' | 'blue';
  phase: NfcPhaseVisual;
  direction: 'send' | 'receive';
  amount?: string;
  tokenSymbol?: string;
  counterparty?: string;
  timeLeft?: number;
  gasEstimate?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
};

const CORE = 92;
const STAGE = 300;

function NfcRadar({
  colors,
  active,
  fast,
  direction,
  reduced,
}: {
  colors: [string, string];
  active: boolean;
  fast: boolean;
  direction: 'send' | 'receive';
  reduced: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || reduced) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: fast ? 1100 : 2400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, fast, reduced, pulse]);

  useEffect(() => {
    if (!active || reduced) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: fast ? 1400 : 3600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, fast, reduced, spin]);

  const ring = (offset: number) => {
    const p = Animated.modulo(Animated.add(pulse, offset), 1);
    return (
      <Animated.View
        key={offset}
        pointerEvents="none"
        style={[
          s.ring,
          {
            borderColor: colors[0],
            opacity: p.interpolate({inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0]}),
            transform: [{scale: p.interpolate({inputRange: [0, 1], outputRange: [1, STAGE / CORE]})}],
          },
        ]}
      />
    );
  };

  const rotate = spin.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  const arcR = CORE / 2 + 16;
  const circ = 2 * Math.PI * arcR;

  return (
    <View style={s.stage}>
      {/* static guide rings */}
      {[0.62, 0.8, 1].map(f => (
        <View
          key={f}
          style={[
            s.guide,
            {
              width: STAGE * f,
              height: STAGE * f,
              borderRadius: (STAGE * f) / 2,
              borderColor: colors[0],
              opacity: 0.1 + (1 - f) * 0.25,
            },
          ]}
        />
      ))}
      {active && !reduced && [0, 0.34, 0.67].map(ring)}
      <Animated.View style={[s.arcWrap, {transform: [{rotate}]}]}>
        <Svg width={arcR * 2 + 6} height={arcR * 2 + 6}>
          <Circle
            cx={arcR + 3}
            cy={arcR + 3}
            r={arcR}
            stroke={colors[0]}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.22} ${circ}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
      <View style={s.core}>
        <GradientFill
          colors={colors}
          angle={135}
          glows={[{color: '#FFFFFF', cx: 0.25, cy: 0.1, r: 0.7, opacity: 0.35}]}
        />
        {direction === 'receive' ? (
          <ReceiveTapIcon size={38} color="#FFFFFF" />
        ) : (
          <ContactlessWave size={38} color="#FFFFFF" />
        )}
      </View>
    </View>
  );
}

export default function NfcWaitingCard({
  accent = 'blue',
  phase,
  direction,
  amount,
  tokenSymbol = 'MON',
  counterparty,
  timeLeft,
  gasEstimate,
  onClose,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const s2 = useMemo(() => createStyles(colors), [colors]);
  const [reduced, setReduced] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);

  const gradient: [string, string] =
    accent === 'green'
      ? ['#30D158', '#30D158']
      : accent === 'purple'
        ? ['#BF5AF2', '#BF5AF2']
        : ['#0A84FF', '#0A84FF'];

  const isSend = direction === 'send';
  const isSuccess = phase === 'success';
  const isBroadcasting = phase === 'broadcasting';
  const isSearching = phase === 'searching';
  const isFailed = phase === 'failed';

  // One cue per phase change (never on re-renders).
  const lastPhase = useRef<NfcPhaseVisual | null>(null);
  useEffect(() => {
    if (lastPhase.current === phase) {
      return;
    }
    const prev = lastPhase.current;
    lastPhase.current = phase;
    if (phase === 'broadcasting' && prev !== null) {
      triggerHaptic.impactMedium();
      playSound('tap_connect');
    } else if (phase === 'failed') {
      playSound('pay_fail');
    }
  }, [phase]);

  let title = '';
  let sub = '';
  if (isSearching) {
    title = isSend ? 'Hold Near Reader' : 'Ready to Receive';
    sub = 'Hold the top of your iPhone near the other phone.'.replace('iPhone', 'phone');
  } else if (isBroadcasting) {
    title = isSend ? 'Sending…' : 'Receiving…';
    sub = 'Keep your phones together';
  } else if (isSuccess) {
    title = isSend ? 'Payment sent' : 'Payment received';
    sub = counterparty ? `${isSend ? 'To' : 'From'} ${counterparty}` : '';
  } else if (isFailed) {
    title = 'Payment failed';
    sub = 'The tap could not be completed.';
  } else if (phase === 'expired') {
    title = 'Session expired';
    sub = 'Restart to accept another payment.';
  } else if (phase === 'received') {
    title = 'Payment received';
    sub = 'Opening details…';
  }

  const statusLabel = isSuccess || phase === 'received'
    ? 'Done'
    : isFailed
      ? 'Failed'
      : phase === 'expired'
        ? 'NFC Off'
        : isBroadcasting
          ? 'Linked'
          : 'Scanning';

  return (
    <View style={[s2.root, {paddingTop: insets.top}]}>
      <AmbientBackground />

      <View style={s2.header}>
        <PressableScale
          style={s2.closeBtn}
          contentStyle={s2.closeBtnInner}
          accessibilityLabel="Close"
          onPress={onClose}>
          <CrossIcon size={14} color={colors.text} />
        </PressableScale>
        <Text style={s2.headerTitle}>{isSend ? 'Tap to Pay' : 'Receive'}</Text>
        <View style={s2.badge}>
          <View style={[s2.badgeDot, {backgroundColor: isFailed ? colors.danger : isSuccess ? colors.success : colors.accent}]} />
          <Text style={s2.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      {!!amount && !isSuccess && (
        <View style={s2.amountWrap}>
          <Text style={s2.amountValue} numberOfLines={1} adjustsFontSizeToFit>
            {amount}
            <Text style={s2.amountUnit}> {tokenSymbol}</Text>
          </Text>
          {timeLeft != null && timeLeft > 0 && <Text style={s2.expiry}>Expires in {timeLeft}s</Text>}
        </View>
      )}

      <View style={s2.center}>
        {isSuccess ? (
          <SuccessBurst colors={['#30D158', '#30D158']} reduced={reduced} onStart={() => playSound('pay_success')} />
        ) : (
          <NfcRadar
            colors={gradient}
            active={isSearching || isBroadcasting}
            fast={isBroadcasting}
            direction={direction}
            reduced={reduced}
          />
        )}
        <Text style={s2.title}>{title}</Text>
        {!!sub && <Text style={s2.sub}>{sub}</Text>}
      </View>

      <View style={[s2.footer, {paddingBottom: insets.bottom + 16}]}>
        {!isSuccess && !!gasEstimate && (
          <View style={s2.gasRow}>
            <Text style={s2.gasText}>Network fee ~{gasEstimate} MON</Text>
            <Text style={[s2.gasText, {color: colors.accent}]}>~1s</Text>
          </View>
        )}
        {footer}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center'},
  guide: {position: 'absolute', borderWidth: 1},
  ring: {position: 'absolute', width: CORE, height: CORE, borderRadius: CORE / 2, borderWidth: 1.5},
  arcWrap: {position: 'absolute', alignItems: 'center', justifyContent: 'center'},
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function createStyles(c: AppColors) {
  return StyleSheet.create({
    root: {flex: 1, backgroundColor: c.background, paddingHorizontal: 20, overflow: 'hidden'},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12},
    closeBtn: {width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden'},
    closeBtnInner: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
    headerTitle: {fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.2},
    badge: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'},
    badgeDot: {width: 7, height: 7, borderRadius: 4},
    badgeText: {fontSize: 12, fontWeight: '600', color: c.text},
    amountWrap: {alignItems: 'center', marginTop: 18},
    amountValue: {fontSize: 52, fontWeight: '700', color: c.text, letterSpacing: -1.5, maxWidth: '100%'},
    amountUnit: {fontSize: 18, fontWeight: '700', color: c.textMuted, letterSpacing: 0},
    expiry: {marginTop: 4, fontSize: 12, fontWeight: '600', color: c.textMuted},
    center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    title: {marginTop: 6, fontSize: 22, fontWeight: '700', color: c.text, textAlign: 'center', letterSpacing: 0.3},
    sub: {marginTop: 6, fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280},
    footer: {paddingTop: 8},
    gasRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12},
    gasText: {fontSize: 12, fontWeight: '600', color: c.textMuted},
  });
}
