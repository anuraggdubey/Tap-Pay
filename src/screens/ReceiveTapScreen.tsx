/**
 * ReceiveTapScreen — NFC reader mode, cryptographic signature verification,
 * reverse username resolution, and biometric payment acceptance.
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {formatMon, truncateAddress} from '../utils/format';
import {PaymentOffer, encodeAcceptResponse} from '../utils/apdu';
import {
  initNfc,
  isNfcSupported,
  isNfcEnabled,
  openNfcSettings,
  readPaymentOffer,
  cancelNfcRead,
} from '../services/nfcReader';
import {loadPrivateKey} from '../services/wallet';
import {reverseResolve} from '../services/registry';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import {PulsingRadar} from '../components/PulsingRadar';
import {triggerHaptic} from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

export default function ReceiveTapScreen({navigation}: Props) {
  const {address} = useWallet();
  const [scanning, setScanning] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [offer, setOffer] = useState<PaymentOffer | null>(null);
  const [senderUsername, setSenderUsername] = useState<string | null>(null);
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Hold your phone near the sender\'s phone');

  const isMountedRef = useRef(true);

  // Reader scanning loop
  const startScanning = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setScanning(true);
    setStatusMessage('Hold your phone near the sender\'s phone');

    try {
      const response = await readPaymentOffer();
      if (!isMountedRef.current) {
        return;
      }

      if (response.status === 'SUCCESS' && response.offer) {
        triggerHaptic.impactMedium();
        setOffer(response.offer);
        setScanning(false);

        // Reverse resolve sender username if on-chain
        try {
          const username = await reverseResolve(response.offer.senderAddress);
          if (isMountedRef.current && username) {
            setSenderUsername(username);
          }
        } catch {
          // Keep sender address if username lookup fails
        }
      } else if (response.status === 'DISCONNECTED') {
        setStatusMessage('Tap interrupted. Move phones closer and hold still.');
        // Retry scanning automatically after brief pause
        setTimeout(() => {
          if (isMountedRef.current && scanning) {
            startScanning();
          }
        }, 1200);
      } else if (response.status === 'SIGNATURE_INVALID') {
        triggerHaptic.notificationError();
        Alert.alert(
          'Security Warning',
          'Could not verify the sender\'s cryptographic signature. Payment rejected for safety.',
          [{text: 'OK', onPress: () => startScanning()}],
        );
      } else if (response.status === 'INVALID_PAYLOAD') {
        triggerHaptic.notificationError();
        Alert.alert(
          'Invalid Data',
          response.errorMessage || 'Corrupted or invalid payment data received.',
          [{text: 'Retry', onPress: () => startScanning()}],
        );
      } else if (response.status !== 'CANCELLED') {
        // Transient error — retry after brief delay
        setTimeout(() => {
          if (isMountedRef.current && scanning) {
            startScanning();
          }
        }, 1000);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setStatusMessage('Scanning resumed. Bring phones together.');
      }
    }
  }, [scanning]);

  // Initial NFC check & start scan
  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      await initNfc();

      const supported = await isNfcSupported();
      if (!supported) {
        if (isMountedRef.current) {
          setNfcModalVisible(true);
        }
        return;
      }

      const enabled = await isNfcEnabled();
      if (!enabled) {
        Alert.alert(
          'NFC Disabled',
          'Please enable NFC in your device settings to receive payments.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Settings', onPress: () => openNfcSettings()},
          ],
        );
        return;
      }

      startScanning();
    })();

    return () => {
      isMountedRef.current = false;
      cancelNfcRead();
    };
  }, []);

  // Handle Biometric-gated Accept
  const handleAccept = async () => {
    if (!offer) {
      return;
    }

    setAccepting(true);

    try {
      // 1. Biometric verification prompt for receiver
      const auth = await loadPrivateKey('Confirm Biometrics to Accept Payment');
      if (!auth) {
        setAccepting(false);
        // User cancelled biometric prompt
        return;
      }

      // 2. Encode 20-byte ACCEPT binary response with receiver address
      if (address) {
        encodeAcceptResponse(address);
      }

      triggerHaptic.notificationSuccess();
      setAccepting(false);

      // 3. Navigate to TransactionStatus to track confirmation
      navigation.navigate('TransactionStatus', {
        txHash: '0x...waiting_broadcast',
        amount: formatMon(offer.amountWei),
        recipient: offer.senderAddress,
      });
    } catch (error: any) {
      triggerHaptic.notificationError();
      setAccepting(false);
      Alert.alert('Acceptance Error', error?.message || 'Failed to authorize payment receipt.');
    }
  };

  const handleReject = () => {
    triggerHaptic.impactMedium();
    setOffer(null);
    setSenderUsername(null);
    startScanning();
  };

  if (scanning) {
    return (
      <View style={styles.container}>
        <View style={styles.scanContainer}>
          <PulsingRadar icon="📱" color="#4CAF50" size={96} active={scanning} />

          <Text style={styles.scanTitle}>Ready to Receive</Text>
          <Text style={styles.scanSubtitle}>{statusMessage}</Text>
          <View style={styles.hintBadge}>
            <Text style={styles.hintText}>NFC Reader Active</Text>
          </View>
        </View>

        {/* NFC Hardware Modal */}
        <NfcNotAvailableModal
          visible={nfcModalVisible}
          onClose={() => setNfcModalVisible(false)}
          onSwitchToUsernamePay={() => {
            setNfcModalVisible(false);
            navigation.replace('UsernamePay');
          }}
        />
      </View>
    );
  }

  if (offer) {
    return (
      <View style={styles.container}>
        <View style={styles.offerContainer}>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>🛡️ Cryptographically Verified</Text>
          </View>

          <Text style={styles.offerLabel}>Incoming Payment</Text>
          <Text style={styles.offerAmount}>{formatMon(offer.amountWei)}</Text>

          {/* Sender Info Card */}
          <View style={styles.senderCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {(senderUsername || 'S').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.senderMeta}>
              {senderUsername && (
                <Text style={styles.senderUsername}>@{senderUsername}</Text>
              )}
              <Text style={styles.senderAddress}>
                {truncateAddress(offer.senderAddress)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.acceptButton, accepting && styles.disabledButton]}
            onPress={handleAccept}
            disabled={accepting}>
            {accepting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptText}>Accept Payment</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
            disabled={accepting}>
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  scanContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  radarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 28,
  },
  scanTitle: {fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 12},
  scanSubtitle: {fontSize: 15, color: '#8888AA', textAlign: 'center', lineHeight: 22, maxWidth: 300},
  hintBadge: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#161622',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262638',
  },
  hintText: {fontSize: 12, fontWeight: '600', color: '#4CAF50'},
  offerContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  verifiedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  verifiedBadgeText: {fontSize: 13, fontWeight: '700', color: '#4CAF50'},
  offerLabel: {fontSize: 14, color: '#8888AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8},
  offerAmount: {fontSize: 48, fontWeight: '800', color: '#FFFFFF', marginBottom: 28},
  senderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181824',
    padding: 16,
    borderRadius: 18,
    width: '100%',
    marginBottom: 36,
    borderWidth: 1,
    borderColor: '#2E2E42',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C5CFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarLetter: {fontSize: 18, fontWeight: '800', color: '#FFFFFF'},
  senderMeta: {flex: 1},
  senderUsername: {fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2},
  senderAddress: {fontSize: 12, color: '#8888AA', fontFamily: 'monospace'},
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {opacity: 0.6},
  acceptText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF'},
  rejectButton: {paddingVertical: 12},
  rejectText: {fontSize: 16, color: '#FF6B6B'},
});
