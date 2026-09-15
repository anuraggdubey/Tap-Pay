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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#14141E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#2B2B3D',
  },
  grabber: {
    width: 44,
    height: 5,
    backgroundColor: '#38384E',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  networkBadge: {
    fontSize: 12,
    color: '#8A8AB0',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  amountBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1C1C28',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D2D3E',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#262636',
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    color: '#8888AA',
  },
  value: {
    fontSize: 14,
    color: '#D0D0E8',
    fontWeight: '600',
  },
  recipientContainer: {
    alignItems: 'flex-end',
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C5CFC',
  },
  address: {
    fontSize: 12,
    color: '#8888AA',
    fontFamily: 'monospace',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4CAF50',
  },
  confirmButton: {
    backgroundColor: '#7C5CFC',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#8888AA',
  },
});
