/**
 * ConfirmPaymentModal — Apple Pay-style confirmation sheet (light glass).
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import {formatMon, truncateAddress} from '../utils/format';
import {MONAD_CONFIG} from '../config/monad';
import PressableScale from './PressableScale';
import {colors, glass, motion, shadows} from '../theme';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  recipient: string;
  recipientUsername?: string | null;
  amountWei: bigint;
  gasCostWei: bigint;
  loading?: boolean;
  tokenSymbol?: string;
  displayAmount?: string;
}

const EASE_SHEET = Easing.bezier(
  motion.easeSheet.x1,
  motion.easeSheet.y1,
  motion.easeSheet.x2,
  motion.easeSheet.y2,
);

export default function ConfirmPaymentModal({
  visible,
  onConfirm,
  onCancel,
  recipient,
  recipientUsername,
  amountWei,
  gasCostWei,
  loading = false,
  tokenSymbol = 'MON',
  displayAmount,
}: Props) {
  const isMon = tokenSymbol === 'MON';
  const totalCostWei = amountWei + gasCostWei;
  const amountStr = isMon ? formatMon(amountWei) : `${displayAmount} ${tokenSymbol}`;
  const totalStr = isMon
    ? formatMon(totalCostWei)
    : `${displayAmount} ${tokenSymbol} + ${formatMon(gasCostWei)}`;

  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(40);
      opacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.sheetMs,
        easing: EASE_SHEET,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.sheetMs,
        easing: EASE_SHEET,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, opacity]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheetContainer,
            {opacity, transform: [{translateY}]},
          ]}>
          <View style={styles.grabber} />

          <Text style={styles.title}>Confirm Payment</Text>
          <Text style={styles.networkBadge}>
            {MONAD_CONFIG.chainName} • Chain {MONAD_CONFIG.chainId} • ~1s Finality
          </Text>

          <View style={styles.amountBox}>
            <Text style={styles.amountNumber}>{amountStr}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <View style={styles.recipientContainer}>
                {recipientUsername && (
                  <Text style={styles.username}>@{recipientUsername}</Text>
                )}
                <Text style={styles.address}>{truncateAddress(recipient)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Estimated Gas</Text>
              <Text style={styles.value}>{formatMon(gasCostWei)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{totalStr}</Text>
            </View>
          </View>

          <PressableScale
            style={[styles.confirmButton, loading && styles.disabledButton]}
            contentStyle={styles.confirmButtonInner}
            onPress={onConfirm}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>Confirm & Pay</Text>
            )}
          </PressableScale>

          <PressableScale
            style={styles.cancelButton}
            contentStyle={styles.cancelButtonInner}
            onPress={onCancel}
            disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: glass.fillHeavy,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderBright,
    ...shadows.heavy,
  },
  grabber: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(60, 60, 67, 0.22)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  networkBadge: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
    fontWeight: '500',
  },
  amountBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  amountNumber: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: -1,
  },
  card: {
    backgroundColor: colors.surfaceSolidElevated,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: 10,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
  },
  value: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  recipientContainer: {
    alignItems: 'flex-end',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  address: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  confirmButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.55,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnAccent,
    letterSpacing: -0.2,
  },
  cancelButton: {
    borderRadius: 12,
  },
  cancelButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
