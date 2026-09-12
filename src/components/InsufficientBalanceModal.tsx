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
            <Text style={styles.iconText}>⚠️</Text>
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
    backgroundColor: '#13131A',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8888AA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  breakdownCard: {
    width: '100%',
    backgroundColor: '#1B1B26',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
    borderTopColor: '#282838',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#8888AA',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C5CFC',
    fontFamily: 'monospace',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#7C5CFC',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#1E1E2C',
    borderWidth: 1,
    borderColor: '#38384E',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E0FF',
  },
  dismissButton: {
    paddingVertical: 8,
    marginTop: 4,
  },
  dismissText: {
    fontSize: 14,
    color: '#666688',
  },
});
