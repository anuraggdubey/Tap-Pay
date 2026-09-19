/**
 * ReceiveTapScreen — NFC Card Emulation mode for One-Way NFC
 * Broadcasts address and polls for incoming payments.
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import {getBalance} from '../services/wallet';
import {reverseResolveAddress} from '../services/registry';
import {recordTransaction} from '../services/history';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import NfcWaitingCard from '../components/NfcWaitingCard';
import {triggerHaptic} from '../utils/haptics';
import {formatMon, truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

export default function ReceiveTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [isReceiving, setIsReceiving] = useState(true);

  const isMountedRef = useRef(true);
  // Use refs for values that change but shouldn't restart the HCE session
  const balanceRef = useRef(balance);
  const navigationRef = useRef(navigation);
  const refreshBalanceRef = useRef(refreshBalance);
  balanceRef.current = balance;
  navigationRef.current = navigation;
  refreshBalanceRef.current = refreshBalance;

  useEffect(() => {
    navigation.setOptions({headerShown: false});
  }, [navigation]);

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

        // Snapshot balance at the time we start waiting
        const previousBalance = balanceRef.current;
        const payment = await waitForIncomingPayment(
          address,
          previousBalance,
          null, // Any amount
        );

        if (payment.detected && isMountedRef.current) {
          setIsReceiving(false);
          await stopReceiverBroadcast();

          // Prefer on-chain amount from PaymentLogged; fall back to balance delta
          let amountStr = 'Unknown';
          if (payment.amountWei != null && payment.amountWei > 0n) {
            amountStr = formatMon(payment.amountWei).replace(/ MON$/, '');
          } else {
            try {
              const currentBalance = await getBalance(address);
              if (currentBalance > previousBalance) {
                amountStr = formatMon(currentBalance - previousBalance).replace(
                  / MON$/,
                  '',
                );
              }
            } catch {
              // Keep Unknown if RPC fails; payment was already detected
            }
          }

          const senderAddress = payment.senderAddress || '';
          let senderUsername: string | undefined;
          if (senderAddress) {
            try {
              senderUsername =
                (await reverseResolveAddress(senderAddress)) || undefined;
            } catch {
              // Username lookup is optional
            }
          }

          refreshBalanceRef.current();
          triggerHaptic.notificationSuccess();

          const counterpartyLabel = senderAddress || 'Unknown (Tap)';

          recordTransaction({
            direction: 'received',
            counterparty: counterpartyLabel,
            counterpartyUsername: senderUsername,
            amount: amountStr,
            status: 'confirmed',
            txHash: payment.txHash || 'tap-payment',
          });

          navigationRef.current.replace('TransactionStatus', {
            txHash: payment.txHash || 'tap-payment',
            amount: amountStr,
            recipient: counterpartyLabel,
            direction: 'received',
            counterpartyUsername: senderUsername,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);


  return (
    <View style={styles.root}>
      <NfcWaitingCard
        accent="green"
        showSpinner={!isReceiving}
        onClose={() => navigation.goBack()}
        title={
          isReceiving ? 'Ready to receive' : "We're processing your payment"
        }
        subtitle={
          isReceiving
            ? 'Hold phones together. Listening for a tap…'
            : 'Payment detected — confirming details.'
        }
        footer={
          !!address ? (
            <Text style={styles.walletHint}>
              {truncateAddress(address, 8, 6)}
            </Text>
          ) : null
        }
      />

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
  root: {
    flex: 1,
  },
  walletHint: {
    marginTop: 18,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
});
