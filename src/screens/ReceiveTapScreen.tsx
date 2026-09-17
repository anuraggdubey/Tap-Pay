/**
 * ReceiveTapScreen — NFC reader mode, signature verification,
 * accept handshake, and incoming payment confirmation.
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
import {PaymentOffer} from '../utils/apdu';
import {
  initNfc,
  isNfcSupported,
  isNfcEnabled,
  openNfcSettings,
  readPaymentOffer,
  cancelNfcRead,
  startContinuousHceScan,
  stopContinuousHceScan,
  isNativeTapReaderAvailable,
} from '../services/nfcReader';
import {loadPrivateKey} from '../services/wallet';
import {reverseResolve} from '../services/registry';
import {
  broadcastReceiverAccept,
  cancelTapSession,
  waitForIncomingPayment,
} from '../services/tapPayment';
import {waitForHceRead, stopHceSession} from '../services/hce';
import {recordTransaction} from '../services/history';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import {PulsingRadar} from '../components/PulsingRadar';
import {triggerHaptic} from '../utils/haptics';
import {buttons, colors, screen} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

type ReceivePhase = 'scanning' | 'review' | 'completing' | 'confirming';

export default function ReceiveTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const [phase, setPhase] = useState<ReceivePhase>('scanning');
  const [accepting, setAccepting] = useState(false);
  const [offer, setOffer] = useState<PaymentOffer | null>(null);
  const [senderUsername, setSenderUsername] = useState<string | null>(null);
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Hold your phone near the sender's phone",
  );

  const isMountedRef = useRef(true);
  const scanningRef = useRef(true);

  const startScanning = useCallback(async () => {
    if (!isMountedRef.current || !scanningRef.current) {
      return;
    }

    setPhase('scanning');
    setStatusMessage(
      'Hold phones back-to-back near the top. Sender must tap "Ready to Tap" first.',
    );

    try {
      const response = await readPaymentOffer();
      if (!isMountedRef.current || !scanningRef.current) {
        return;
      }

      if (response.status === 'SUCCESS' && response.offer) {
        triggerHaptic.impactMedium();
        setOffer(response.offer);
        setPhase('review');
        scanningRef.current = false;

        try {
          const username = await reverseResolve(response.offer.senderAddress);
          if (isMountedRef.current && username) {
            setSenderUsername(username);
          }
        } catch {
          // Username lookup is optional
        }
        return;
      }

      if (response.status === 'TIMEOUT') {
        setStatusMessage(
          response.errorMessage ||
            'Scanning… hold phones back-to-back near the top (NFC antenna area).',
        );
        setTimeout(() => {
          if (isMountedRef.current && scanningRef.current) {
            startScanning();
          }
        }, 800);
        return;
      }

      if (response.status === 'DISCONNECTED') {
        setStatusMessage('Tap interrupted. Move phones closer and hold still.');
        setTimeout(() => {
          if (isMountedRef.current && scanningRef.current) {
            startScanning();
          }
        }, 1200);
        return;
      }

      if (response.status === 'SIGNATURE_INVALID') {
        triggerHaptic.notificationError();
        Alert.alert(
          'Security Warning',
          "Could not verify the sender's cryptographic signature. Payment rejected.",
          [{text: 'OK', onPress: () => startScanning()}],
        );
        return;
      }

      if (response.status === 'INVALID_PAYLOAD') {
        triggerHaptic.notificationError();
        Alert.alert(
          'Invalid Data',
          response.errorMessage || 'Corrupted payment data received.',
          [{text: 'Retry', onPress: () => startScanning()}],
        );
        return;
      }

      if (response.status !== 'CANCELLED') {
        setTimeout(() => {
          if (isMountedRef.current && scanningRef.current) {
            startScanning();
          }
        }, 1000);
      }
    } catch {
      if (isMountedRef.current && scanningRef.current) {
        setStatusMessage('Scanning resumed. Bring phones together.');
        setTimeout(() => startScanning(), 1000);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    scanningRef.current = true;

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

      if (isNativeTapReaderAvailable()) {
        await startContinuousHceScan();
      }

      startScanning();
    })();

    return () => {
      isMountedRef.current = false;
      scanningRef.current = false;
      stopContinuousHceScan();
      cancelNfcRead();
      stopHceSession();
    };
  }, [startScanning]);

  const handleAccept = async () => {
    if (!offer || !address) {
      return;
    }

    setAccepting(true);

    try {
      const auth = await loadPrivateKey('Confirm Biometrics to Accept Payment');
      if (!auth) {
        setAccepting(false);
        return;
      }

      setPhase('completing');

      // Receiver must stop reader mode before broadcasting accept via HCE
      await stopContinuousHceScan();

      const started = await broadcastReceiverAccept(address, offer.sessionId);
      if (!started) {
        throw new Error('Failed to broadcast accept response over NFC.');
      }

      triggerHaptic.impactMedium();

      const readBySender = await waitForHceRead(60_000);
      if (!readBySender) {
        Alert.alert(
          'Tap Required',
          'Hold phones together so the sender can read your acceptance.',
          [{text: 'Retry', onPress: () => handleAccept()}],
        );
        setAccepting(false);
        setPhase('review');
        return;
      }

      setPhase('confirming');
      await stopHceSession();

      const previousBalance = balance;
      const confirmed = await waitForIncomingPayment(
        address,
        previousBalance,
        offer.amountWei,
      );

      refreshBalance();
      triggerHaptic.notificationSuccess();

      recordTransaction({
        direction: 'received',
        counterparty: offer.senderAddress,
        counterpartyUsername: senderUsername || undefined,
        amount: formatMon(offer.amountWei).replace(' MON', ''),
        status: confirmed ? 'confirmed' : 'pending',
        txHash: confirmed ? `tap-${offer.sessionId}` : 'pending',
      });

      navigation.replace('TransactionStatus', {
        txHash: confirmed ? `tap-${offer.sessionId}` : 'pending',
        amount: formatMon(offer.amountWei).replace(' MON', ''),
        recipient: offer.senderAddress,
        direction: 'received',
        counterpartyUsername: senderUsername || undefined,
        waitForBalance: !confirmed,
        expectedAmountWei: offer.amountWei.toString(),
      });
    } catch (error: any) {
      triggerHaptic.notificationError();
      setAccepting(false);
      setPhase('review');
      Alert.alert('Acceptance Error', error?.message || 'Failed to complete tap payment.');
    }
  };

  const handleReject = () => {
    triggerHaptic.impactMedium();
    setOffer(null);
    setSenderUsername(null);
    scanningRef.current = true;
    startScanning();
  };

  if (phase === 'scanning') {
    return (
      <View style={screen.container}>
        <View style={screen.centered}>
          <PulsingRadar label="RECEIVE" color={colors.success} size={96} active />

          <Text style={screen.title}>Ready to Receive</Text>
          <Text style={screen.subtitle}>{statusMessage}</Text>

          <View style={[screen.badge, {borderColor: 'rgba(16, 185, 129, 0.25)'}]}>
            <Text style={[screen.badgeText, {color: colors.success}]}>
              {isNativeTapReaderAvailable() ? 'Native NFC Reader Active' : 'NFC Reader Active'}
            </Text>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Receiver steps</Text>
            <Text style={styles.stepItem}>1. Sender taps Ready to Tap, then hold phones back-to-back</Text>
            <Text style={styles.stepItem}>2. Review amount and tap Accept</Text>
            <Text style={styles.stepItem}>3. Tap phones together again to confirm</Text>
          </View>
        </View>

        <NfcNotAvailableModal
          visible={nfcModalVisible}
          onClose={() => setNfcModalVisible(false)}
          onSwitchToUsernamePay={() => {
            setNfcModalVisible(false);
            navigation.navigate('SendPayment');
          }}
        />
      </View>
    );
  }

  if (phase === 'completing' || phase === 'confirming') {
    return (
      <View style={screen.container}>
        <View style={screen.centered}>
          <PulsingRadar
            label="RECEIVE"
            color={colors.success}
            size={96}
            active={phase === 'completing'}
          />
          <Text style={screen.title}>
            {phase === 'completing' ? 'Hold Phones Together' : 'Confirming Payment'}
          </Text>
          <Text style={screen.subtitle}>
            {phase === 'completing'
              ? 'Your acceptance is broadcasting.\nKeep phones close until the sender reads it.'
              : 'Waiting for Monad to confirm the incoming payment…'}
          </Text>
          <ActivityIndicator color={colors.success} style={{marginTop: 24}} />
        </View>
      </View>
    );
  }

  if (offer) {
    return (
      <View style={screen.container}>
        <View style={screen.centered}>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>Verified • ECDSA Signed</Text>
          </View>

          <Text style={screen.sectionLabel}>Incoming Payment</Text>
          <Text style={styles.offerAmount}>{formatMon(offer.amountWei)}</Text>

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

          <TouchableOpacity
            style={[buttons.success, accepting && buttons.disabled, {width: '100%'}]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}>
            {accepting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={buttons.primaryText}>Accept Payment</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttons.secondary, {width: '100%', marginTop: 12}]}
            onPress={handleReject}
            disabled={accepting}
            activeOpacity={0.85}>
            <Text style={buttons.secondaryText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  stepsCard: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepItem: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 20,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.5,
  },
  offerAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  senderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    width: '100%',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E2D',
    borderWidth: 1,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  senderMeta: {
    flex: 1,
  },
  senderUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  senderAddress: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
});
