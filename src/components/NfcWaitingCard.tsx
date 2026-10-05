/**
 * NfcWaitingCard — Full-screen NFC waiting UI (light Apple glass).
 * Properly centered ContactlessWave + soft pulse rings.
 * Pure UI; no NFC / payment logic.
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CrossIcon, ContactlessWave} from './AppIcons';
import PressableScale from './PressableScale';
import {colors, glass, radii, shadows} from '../theme';

type NfcPhaseVisual = 'searching' | 'broadcasting' | 'success' | 'failed';

type Props = {
  accent?: 'purple' | 'green' | 'blue';
  phase: NfcPhaseVisual;
  direction: 'send' | 'receive';
  amount?: string;
  counterparty?: string;
  timeLeft?: number;
  gasEstimate?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
};

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
    const scale = val.interpolate({inputRange: [0, 1], outputRange: [1, 2.35]});
    const opacity = val.interpolate({
      inputRange: [0, 0.15, 0.7, 1],
      outputRange: [0, 0.35, 0.1, 0],
    });
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          radar.ring,
          {
            borderColor: color,
            transform: [{scale}],
            opacity,
          },
        ]}
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
      <View style={[radar.circle, {borderColor: color + '33', backgroundColor: color + '14'}]}>
        <View style={[radar.innerGlow, {backgroundColor: color}]}>
          <ContactlessWave size={36} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

const radar = StyleSheet.create({
  wrap: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
  },
  circle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: glass.fillElevated,
    ...shadows.soft,
  },
  innerGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function GPayCheck({color}: {color: string}) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 120,
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
    ...shadows.medium,
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

export default function NfcWaitingCard({
  accent = 'blue',
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
  const accentColor =
    accent === 'green'
      ? colors.success
      : accent === 'purple'
        ? colors.accentPurple
        : colors.accent;
  const isSend = direction === 'send';
  const isSuccess = phase === 'success';
  const isBroadcasting = phase === 'broadcasting';
  const isSearching = phase === 'searching';

  const headerLabel = isSend ? 'Send Tap (NFC)' : 'Receive Tap (NFC)';

  let statusTitle = '';
  let statusSub = '';
  if (isSearching) {
    statusTitle = 'Ready to Tap';
    statusSub = isSend
      ? 'Hold phones back-to-back within 4cm'
      : 'Hold phones back-to-back within 4cm';
  } else if (isBroadcasting) {
    statusTitle = isSend ? 'Sending payment…' : 'Receiving payment…';
    statusSub = 'Broadcasting to Monad Mainnet…';
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
      <View style={s.bgOrbTop} />
      <View style={s.bgOrbBottom} />

      <View style={s.header}>
        <PressableScale style={s.closeBtn} contentStyle={s.closeBtnInner} onPress={onClose}>
          <CrossIcon size={14} color={colors.text} />
        </PressableScale>

        <Text style={s.headerTitle}>{headerLabel}</Text>

        <View
          style={[
            s.nfcBadge,
            {
              backgroundColor: isSuccess
                ? 'rgba(52, 199, 89, 0.14)'
                : colors.accentWash,
            },
          ]}>
          <Text
            style={[
              s.nfcBadgeText,
              {color: isSuccess ? colors.success : colors.accent},
            ]}>
            {isSuccess ? 'Done' : 'NFC Active'}
          </Text>
        </View>
      </View>

      {!!amount && !isSuccess && (
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>TRANSFER AMOUNT</Text>
          <View style={s.amountRow}>
            <Text style={s.amountValue}>{amount}</Text>
            <Text style={s.amountUnit}> MON</Text>
          </View>
          {timeLeft != null && timeLeft > 0 && (
            <Text style={s.expiryText}>Expires in {timeLeft}s</Text>
          )}
        </View>
      )}

      <View style={s.centerStage}>
        {isSuccess ? (
          <GPayCheck color={accentColor} />
        ) : (
          <NfcRadar color={accentColor} active={isSearching || isBroadcasting} />
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

      {isSuccess && (
        <View style={s.successDetails}>
          <View style={s.successRow}>
            <Text style={s.successLabel}>Amount</Text>
            <Text style={s.successValue}>
              {isSend ? '-' : '+'}
              {amount} MON
            </Text>
          </View>
          {!!counterparty && (
            <View style={s.successRow}>
              <Text style={s.successLabel}>{isSend ? 'To' : 'From'}</Text>
              <Text style={s.successValue} numberOfLines={1}>
                {counterparty}
              </Text>
            </View>
          )}
          <View style={s.successRow}>
            <Text style={s.successLabel}>Network</Text>
            <Text style={[s.successValue, {color: colors.success}]}>
              Monad Mainnet
            </Text>
          </View>
        </View>
      )}

      <View style={[s.footer, {paddingBottom: insets.bottom + 16}]}>
        {!isSuccess && gasEstimate && (
          <View style={s.gasRow}>
            <Text style={s.gasText}>Gas: ~{gasEstimate} MON</Text>
            <Text style={[s.gasText, {color: colors.accent}]}>1s Finality</Text>
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
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  bgOrbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(100, 210, 255, 0.1)',
  },
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
    backgroundColor: glass.fillElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    overflow: 'hidden',
  },
  closeBtnInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
    letterSpacing: -0.2,
  },
  nfcBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  nfcBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountCard: {
    backgroundColor: glass.fillElevated,
    borderRadius: radii.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderBright,
    ...shadows.soft,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
  },
  amountUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
  },
  expiryText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  statusSub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
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
  successDetails: {
    backgroundColor: glass.fillElevated,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    gap: 14,
    ...shadows.soft,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  successValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    maxWidth: '65%',
  },
  footer: {
    paddingTop: 8,
  },
  gasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: glass.fillElevated,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  gasText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
