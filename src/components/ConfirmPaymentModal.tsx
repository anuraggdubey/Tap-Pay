/**
 * ConfirmPaymentModal — Apple Pay-style payment confirmation sheet
 * Displays recipient, amount, estimated gas, and total cost before broadcast.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {formatMon, truncateAddress} from '../utils/format';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  recipient: string;
  recipientUsername?: string | null;
  amountWei: bigint;
  gasCostWei: bigint;
  loading?: boolean;
}

export default function ConfirmPaymentModal({
  visible,
  onConfirm,
  onCancel,
  recipient,
  recipientUsername,
  amountWei,
  gasCostWei,
  loading = false,
}: Props) {
  const totalCostWei = amountWei + gasCostWei;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Top Grabber Indicator */}
          <View style={styles.grabber} />

          <Text style={styles.title}>Confirm Payment</Text>
          <Text style={styles.networkBadge}>Monad Testnet • ~1s Finality</Text>

          {/* Amount Display */}
          <View style={styles.amountBox}>
            <Text style={styles.amountNumber}>{formatMon(amountWei)}</Text>
          </View>

          {/* Details Card */}
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
              <Text style={styles.totalValue}>{formatMon(totalCostWei)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.disabledButton]}
            onPress={onConfirm}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>Confirm & Pay</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#15151E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#252533',
  },
  grabber: {
    width: 36,
    height: 4,
    backgroundColor: '#38384E',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  networkBadge: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 18,
    fontWeight: '600',
  },
  amountBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  amountNumber: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#1C1C26',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262638',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#262638',
    marginVertical: 10,
  },
  label: {
    fontSize: 13,
    color: '#8E8E93',
  },
  value: {
    fontSize: 13,
    color: '#D0D0E8',
    fontWeight: '600',
  },
  recipientContainer: {
    alignItems: 'flex-end',
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6E54FF',
  },
  address: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  confirmButton: {
    backgroundColor: '#6E54FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
});
