/**
 * ReceiveTapScreen — NFC Card Emulation mode for One-Way NFC
 * Broadcasts address and polls for incoming payments.
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  initNfc,
  isNfcSupported,
  isNfcEnabled,
  openNfcSettings,
} from '../services/nfcReader';
import {
  startReceiverBroadcast,
  stopReceiverBroadcast,
  waitForIncomingPayment,
} from '../services/tapPayment';
import {recordTransaction} from '../services/history';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import {PulsingRadar} from '../components/PulsingRadar';
import {triggerHaptic} from '../utils/haptics';
import {colors, screen} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

export default function ReceiveTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [isReceiving, setIsReceiving] = useState(true);

  const isMountedRef = useRef(true);

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

      if (address) {
        // Start HCE broadcasting address
        const started = await startReceiverBroadcast(address);
        if (!started) {
           Alert.alert('Error', 'Failed to start NFC broadcast.');
           return;
        }

        // Poll for any incoming payment
        const previousBalance = balance;
        const confirmed = await waitForIncomingPayment(
          address,
          previousBalance,
          null, // Any amount
        );

        if (confirmed && isMountedRef.current) {
          setIsReceiving(false);
          await stopReceiverBroadcast();
          refreshBalance();
          triggerHaptic.notificationSuccess();

          recordTransaction({
            direction: 'received',
            counterparty: 'Unknown (Tap)',
            amount: 'Unknown',
            status: 'confirmed',
            txHash: 'tap-payment',
          });

          navigation.replace('TransactionStatus', {
            txHash: 'tap-payment',
            amount: 'Unknown',
            recipient: address,
            direction: 'received',
            waitForBalance: false,
            expectedAmountWei: '0',
          });
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
      stopReceiverBroadcast();
    };
  }, [address, balance, navigation, refreshBalance]);


  return (
    <View style={screen.container}>
      <View style={screen.centered}>
        <PulsingRadar label="RECEIVE" color={colors.success} size={96} active={isReceiving} />

        <Text style={screen.title}>Ready to Receive</Text>
        <Text style={screen.subtitle}>
          Hold your phone near the sender's phone.
        </Text>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Receiver steps</Text>
          <Text style={styles.stepItem}>1. Sender taps your phone.</Text>
          <Text style={styles.stepItem}>2. Sender's phone reads your address instantly.</Text>
          <Text style={styles.stepItem}>3. Payment is broadcasted on Monad.</Text>
        </View>

        {!isReceiving && (
          <ActivityIndicator color={colors.success} style={{marginTop: 24}} />
        )}
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
});
