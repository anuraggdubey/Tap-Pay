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
import {getBalance} from '../services/wallet';
import {reverseResolveAddress} from '../services/registry';
import {recordTransaction} from '../services/history';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import {PulsingRadar} from '../components/PulsingRadar';
import {triggerHaptic} from '../utils/haptics';
import {formatMon, truncateAddress} from '../utils/format';
import {colors, screen, spacing} from '../theme';

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
    <View style={screen.container}>
      <View style={styles.stage}>
        <View style={styles.radarWrap}>
          <PulsingRadar
            label="RECEIVE"
            color={colors.success}
            size={88}
            active={isReceiving}
          />
        </View>

        <Text style={styles.title}>
          {isReceiving ? 'Ready to receive' : 'Payment detected'}
        </Text>
        <Text style={styles.subtitle}>
          {isReceiving
            ? 'Hold phones back-to-back until the sender finishes.'
            : 'Confirming details…'}
        </Text>

        {!!address && (
          <View style={styles.walletChip}>
            <Text style={styles.walletChipLabel}>Your wallet</Text>
            <Text style={styles.walletChipValue}>
              {truncateAddress(address, 8, 6)}
            </Text>
          </View>
        )}

        <View style={styles.statusRow}>
          {isReceiving ? (
            <>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>Listening for tap</Text>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.success} size="small" />
              <Text style={styles.statusText}>Opening receipt…</Text>
            </>
          )}
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

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  radarWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 28,
  },
  walletChip: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 220,
    marginBottom: 20,
  },
  walletChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  walletChipValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
