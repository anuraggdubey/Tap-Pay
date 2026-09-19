/**
 * InsufficientBalanceModal — Warns user when MON balance is lower than amount + gas fee.
 * Offers quick link to Monad faucet and address copy.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Clipboard,
  Alert,
} from 'react-native';
import {MONAD_CONFIG} from '../config/monad';
import {formatMon, truncateAddress} from '../utils/format';

interface Props {
  visible: boolean;
  onClose: () => void;
  requiredWei: bigint;
  currentBalanceWei: bigint;
  userAddress: string;
}

export default function InsufficientBalanceModal({
  visible,
  onClose,
  requiredWei,
  currentBalanceWei,
  userAddress,
}: Props) {
  const handleOpenFaucet = () => {
    Linking.openURL(MONAD_CONFIG.faucetUrl).catch(() => {
      Alert.alert('Error', 'Unable to open faucet URL. Please visit https://faucet.monad.xyz');
    });
  };

  const handleCopyAddress = () => {
    Clipboard.setString(userAddress);
    Alert.alert('Address Copied', 'Your wallet address has been copied to the clipboard. Paste it into the Monad testnet faucet!');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconBadgeText}>!</Text>
          </View>

          <Text style={styles.title}>Insufficient MON</Text>
          <Text style={styles.subtitle}>
            You do not have enough funds on Monad Testnet to cover this transaction and network gas fee.
          </Text>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Required (Total + Gas):</Text>
              <Text style={styles.breakdownValue}>{formatMon(requiredWei)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Available Balance:</Text>
              <Text style={[styles.breakdownValue, {color: '#FF6B6B'}]}>
                {formatMon(currentBalanceWei)}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.addressRow]}>
              <Text style={styles.breakdownLabel}>Your Address:</Text>
              <Text style={styles.addressValue}>{truncateAddress(userAddress)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleOpenFaucet}>
            <Text style={styles.primaryButtonText}>Get Testnet MON (Faucet)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleCopyAddress}>
            <Text style={styles.secondaryButtonText}>Copy Wallet Address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#15151E',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242433',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadgeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EF4444',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  breakdownCard: {
    width: '100%',
    backgroundColor: '#1C1C26',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#242433',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressRow: {
    marginBottom: 0,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242433',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E54FF',
    fontFamily: 'monospace',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#6E54FF',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#1C1C26',
    borderWidth: 1,
    borderColor: '#242433',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingVertical: 8,
    marginTop: 2,
  },
  dismissText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '600',
  },
});
