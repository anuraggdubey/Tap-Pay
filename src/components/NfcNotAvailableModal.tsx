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
            <Text style={styles.iconText}>📡</Text>
          </View>

          <Text style={styles.title}>NFC Not Available</Text>
          <Text style={styles.subtitle}>
            This device does not support NFC card emulation or proximity reading required for Tap Pay.
          </Text>

          <View style={styles.alternativeCard}>
            <Text style={styles.altHeading}>Alternative Payment Mode:</Text>
            <Text style={styles.altBody}>
              You can still send and receive payments instantly on Monad using @usernames without needing physical tap contact.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onSwitchToUsernamePay}>
            <Text style={styles.primaryText}>Use Username Pay</Text>
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
    borderColor: '#2D2D3E',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 92, 252, 0.15)',
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
  alternativeCard: {
    backgroundColor: '#1C1C28',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#262638',
  },
  altHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C5CFC',
    marginBottom: 4,
  },
  altBody: {
    fontSize: 12,
    color: '#A0A0C0',
    lineHeight: 18,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#7C5CFC',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    color: '#666688',
  },
});
