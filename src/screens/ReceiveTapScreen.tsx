/**
 * ReceiveTapScreen — NFC Card Emulation mode for One-Way NFC
 * Broadcasts address and polls for incoming payments.
 */

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  initNfc,
  isNfcSupported,
  isNfcEnabled,
  openNfcSettings,
} from '../services/nfcReader';
import {
  createReceiverBroadcastLease,
  waitForIncomingPayment,
} from '../services/tapPayment';
import {reverseResolveAddress} from '../services/registry';
import {recordTransaction} from '../services/history';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import NfcWaitingCard from '../components/NfcWaitingCard';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

export default function ReceiveTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    let cancelled = false;
    const receiver = createReceiverBroadcastLease();
    isMountedRef.current = true;

    (async () => {
      await initNfc();
      if (cancelled) return;

      const supported = await isNfcSupported();
      if (cancelled) return;
      if (!supported) {
        if (isMountedRef.current) {
          setNfcModalVisible(true);
        }
        return;
      }

      const enabled = await isNfcEnabled();
      if (cancelled) return;
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
        const started = await receiver.start(address);
        if (!started) {
           if (cancelled) return;
           Alert.alert('Error', 'Failed to start NFC broadcast.');
           return;
        }

        if (cancelled) {
          await receiver.stop();
          return;
        }
        // Detection is driven by a confirmed on-chain ledger event, not by any balance change.
        const payment = await waitForIncomingPayment(address);

        if (payment.detected && isMountedRef.current) {
          setIsReceiving(false);
          await receiver.stop();

          const tokenSymbol = payment.tokenSymbol || 'MON';
          const amountStr = payment.amountDisplay ?? 'Unknown';

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
            tokenSymbol,
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
            tokenSymbol,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      receiver.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);


  return (
    <View style={styles.root}>
      <NfcWaitingCard
        accent="blue"
        phase={isReceiving ? 'searching' : 'broadcasting'}
        direction="receive"
        onClose={() => navigation.goBack()}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  walletHint: {
    marginTop: 18,
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontWeight: '600',
    textAlign: 'center',
  },
  });
}
