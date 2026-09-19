/**
 * NfcNotAvailableModal — Alert displayed when a device lacks NFC hardware support
 * Recommends Username Pay as an instant on-chain alternative.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSwitchToUsernamePay: () => void;
}

export default function NfcNotAvailableModal({
  visible,
  onClose,
  onSwitchToUsernamePay,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconBadgeText}>NFC</Text>
          </View>

          <Text style={styles.title}>NFC Not Available</Text>
          <Text style={styles.subtitle}>
            This device does not support NFC card emulation or proximity reading required for Tap Pay.
          </Text>

          <View style={styles.alternativeCard}>
            <Text style={styles.altHeading}>Alternative Payment Mode:</Text>
            <Text style={styles.altBody}>
              You can still send and receive payments instantly on Monad using @usernames or direct wallet addresses.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onSwitchToUsernamePay}>
            <Text style={styles.primaryText}>Use Direct Pay</Text>
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
    backgroundColor: 'rgba(110, 84, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6E54FF',
    letterSpacing: 1,
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
  alternativeCard: {
    backgroundColor: '#1C1C26',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#242433',
  },
  altHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6E54FF',
    marginBottom: 4,
  },
  altBody: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#6E54FF',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '600',
  },
});
