/**
 * NfcWaitingCard — Full-screen NFC waiting UI matching the TapPay design.
 * Shows amount, NFC radar, status messages.
 * GPay-style animated checkmark on success.
 * Pure UI; no NFC / payment logic.
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CrossIcon} from './AppIcons';
import {colors} from '../theme';

type NfcPhaseVisual = 'searching' | 'broadcasting' | 'success' | 'failed';

type Props = {
  accent?: 'purple' | 'green';
  phase: NfcPhaseVisual;
  direction: 'send' | 'receive';
  amount?: string;
  counterparty?: string;
  timeLeft?: number;
  gasEstimate?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
};

/* ──── Pulsing NFC Radar ──── */
function NfcRadar({color, active}: {color: string; active: boolean}) {
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

    const makePulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {toValue: 0, duration: 0, useNativeDriver: true}),
        ]),
      );

    const p1 = makePulse(anim1, 0);
    const p2 = makePulse(anim2, 700);
    const p3 = makePulse(anim3, 1400);
    p1.start();
    p2.start();
    p3.start();
    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [active, anim1, anim2, anim3]);

  const ring = (val: Animated.Value) => {
    const scale = val.interpolate({inputRange: [0, 1], outputRange: [1, 2.4]});
    const opacity = val.interpolate({inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.3, 0.08, 0]});
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: 45,
          borderWidth: 1.5,
          borderColor: color,
          transform: [{scale}],
          opacity,
        }}
      />
    );
  };

  return (
    <View style={radar.wrap}>
      {active && (
        <>
          {ring(anim1)}
          {ring(anim2)}
          {ring(anim3)}
        </>
      )}
      <View style={radar.circle}>
        {/* Contactless NFC arcs */}
        <View style={radar.arcsWrap}>
          <View style={[radar.arcOuter, {borderColor: '#FFFFFF'}]} />
          <View style={[radar.arcMid, {borderColor: '#FFFFFF'}]} />
          <View style={[radar.arcInner, {borderColor: '#FFFFFF'}]} />
          <View style={[radar.arcDot, {backgroundColor: '#FFFFFF'}]} />
        </View>
      </View>
    </View>
  );
}

const radar = StyleSheet.create({
  wrap: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2A2A34',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcsWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arcOuter: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{rotate: '-45deg'}],
  },
  arcMid: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{rotate: '-45deg'}],
  },
  arcInner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
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
    left: 12,
  },
});

/* ──── GPay-style Animated Checkmark ──── */
function GPayCheck({color}: {color: string}) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        checkStyles.wrap,
        {
          backgroundColor: color,
          opacity,
          transform: [{scale}],
        },
      ]}>
      {/* Tick built from two bars */}
      <View style={checkStyles.tickContainer}>
        <View style={[checkStyles.tickShort, {backgroundColor: '#FFFFFF'}]} />
        <View style={[checkStyles.tickLong, {backgroundColor: '#FFFFFF'}]} />
      </View>
    </Animated.View>
  );
}

const checkStyles = StyleSheet.create({
  wrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickContainer: {
    width: 48,
    height: 36,
    position: 'relative',
  },
  tickShort: {
    position: 'absolute',
    width: 4,
    height: 20,
    borderRadius: 2,
    bottom: 2,
    left: 8,
    transform: [{rotate: '-45deg'}],
  },
  tickLong: {
    position: 'absolute',
    width: 4,
    height: 34,
    borderRadius: 2,
    bottom: 2,
    left: 22,
    transform: [{rotate: '40deg'}],
  },
});

/* ──── Main NfcWaitingCard ──── */
export default function NfcWaitingCard({
  accent = 'purple',
  phase,
  direction,
  amount,
  counterparty,
  timeLeft,
  gasEstimate,
  onClose,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();
  const accentColor = accent === 'green' ? colors.success : '#7C5CFF';
  const isSend = direction === 'send';
  const isSuccess = phase === 'success';
  const isBroadcasting = phase === 'broadcasting';
  const isSearching = phase === 'searching';

  // Header label
  const headerLabel = isSend ? 'Send Tap (NFC)' : 'Receive Tap (NFC)';

  // Status text
  let statusTitle = '';
  let statusSub = '';
  if (isSearching) {
    statusTitle = 'Ready to Tap';
    statusSub = isSend
      ? 'Hold phone within 4cm of receiver'
      : 'Hold phone within 4cm of sender';
  } else if (isBroadcasting) {
    statusTitle = isSend ? 'Sending payment…' : 'Receiving payment…';
    statusSub = 'Broadcasting to Monad testnet…';
  } else if (isSuccess) {
    statusTitle = isSend ? 'Payment Sent!' : 'Payment Received!';
    statusSub = isSend
      ? `${amount || ''} MON sent successfully`
      : `${amount || ''} MON received${counterparty ? ` from ${counterparty}` : ''}`;
  } else if (phase === 'failed') {
    statusTitle = 'Payment Failed';
    statusSub = 'The tap session could not be completed.';
  }

  return (
    <View style={[s.root, {paddingTop: insets.top}]}>
      {/* ── Header Row ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <CrossIcon size={14} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>{headerLabel}</Text>

        <View
          style={[
            s.nfcBadge,
            {backgroundColor: isSuccess ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.16)'},
          ]}>
          <Text style={s.nfcBadgeText}>
            {isSuccess ? '✓ Done' : 'NFC Active'}
          </Text>
        </View>
      </View>

      {/* ── Amount Card ── */}
      {!!amount && !isSuccess && (
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>TRANSFER AMOUNT</Text>
          <View style={s.amountRow}>
            <Text style={s.amountValue}>{amount}</Text>
            <Text style={s.amountUnit}> MON</Text>
          </View>
          {timeLeft != null && timeLeft > 0 && (
            <Text style={s.expiryText}>
              Expires in {timeLeft}s
            </Text>
          )}
        </View>
      )}

      {/* ── Center Visual ── */}
      <View style={s.centerStage}>
        {isSuccess ? (
          <GPayCheck color={accentColor} />
        ) : (
          <NfcRadar color={accentColor} active={isSearching} />
        )}

        <Text style={s.statusTitle}>{statusTitle}</Text>
        <Text style={s.statusSub}>{statusSub}</Text>

        {isBroadcasting && (
          <View style={s.broadcastDots}>
            <View style={[s.dot, {backgroundColor: accentColor}]} />
            <View style={[s.dot, {backgroundColor: accentColor, opacity: 0.6}]} />
            <View style={[s.dot, {backgroundColor: accentColor, opacity: 0.3}]} />
          </View>
        )}
      </View>

      {/* ── Success Details ── */}
      {isSuccess && (
        <View style={s.successDetails}>
          <View style={s.successRow}>
            <Text style={s.successLabel}>Amount</Text>
            <Text style={s.successValue}>
              {isSend ? '-' : '+'}{amount} MON
            </Text>
          </View>
          {!!counterparty && (
            <View style={s.successRow}>
              <Text style={s.successLabel}>
                {isSend ? 'To' : 'From'}
              </Text>
              <Text style={s.successValue} numberOfLines={1}>
                {counterparty}
              </Text>
            </View>
          )}
          <View style={s.successRow}>
            <Text style={s.successLabel}>Network</Text>
            <Text style={[s.successValue, {color: colors.success}]}>
              Monad Testnet
            </Text>
          </View>
        </View>
      )}

      {/* ── Footer (Gas Info / Cancel) ── */}
      <View style={[s.footer, {paddingBottom: insets.bottom + 16}]}>
        {!isSuccess && gasEstimate && (
          <View style={s.gasRow}>
            <Text style={s.gasText}>Gas: ~{gasEstimate} MON</Text>
            <Text style={[s.gasText, {color: colors.success}]}>
              1s Finality
            </Text>
          </View>
        )}

        {footer}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 20,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  nfcBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  nfcBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },

  /* Amount Card */
  amountCard: {
    backgroundColor: '#151520',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  amountUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  expiryText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
  },

  /* Center Stage */
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statusSub: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  broadcastDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* Success Details */
  successDetails: {
    backgroundColor: '#151520',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  successValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth: '65%',
  },

  /* Footer */
  footer: {
    paddingTop: 8,
  },
  gasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  gasText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
});
