/**
 * TransactionStatusScreen — Pending/confirmed/failed with Monad receipt polling
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getExplorerTxUrl} from '../config/monad';
import {truncateAddress} from '../utils/format';
import {waitForReceipt, getBalance} from '../services/wallet';
import {useWallet} from '../context/WalletContext';
import {triggerHaptic} from '../utils/haptics';
import {updateTransactionStatus} from '../services/history';
import {CheckGlyph, CrossIcon} from '../components/AppIcons';
import {buttons, colors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionStatus'>;
  route: RouteProp<RootStackParamList, 'TransactionStatus'>;
};

export default function TransactionStatusScreen({navigation, route}: Props) {
  const {
    txHash,
    amount,
    recipient,
    direction = 'sent',
    counterpartyUsername,
    waitForBalance,
    expectedAmountWei,
  } = route.params;
  const {address, balance, refreshBalance} = useWallet();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const isRealTxHash = txHash && !txHash.startsWith('0x...') && txHash !== 'pending' && !txHash.startsWith('tap-');

  const markConfirmed = () => {
    triggerHaptic.notificationSuccess();
    if (isRealTxHash) {
      updateTransactionStatus(txHash, 'confirmed');
    }
    setStatus('confirmed');
    Animated.spring(checkmarkScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
    refreshBalance();
  };

  const markFailed = (message: string) => {
    triggerHaptic.notificationError();
    if (isRealTxHash) {
      updateTransactionStatus(txHash, 'failed');
    }
    setStatus('failed');
    setErrorMessage(message);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (waitForBalance && address && expectedAmountWei) {
        const expected = BigInt(expectedAmountWei);
        const baseline = balance;
        const deadline = Date.now() + 30_000;

        while (Date.now() < deadline && isMounted) {
          try {
            const current = await getBalance(address);
            if (current >= baseline + expected) {
              if (isMounted) {
                markConfirmed();
              }
              return;
            }
          } catch {
            // Continue polling
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (isMounted) {
          markFailed('Payment not detected yet. It may still arrive shortly.');
        }
        return;
      }

      if (!isRealTxHash) {
        return;
      }

      try {
        const result = await waitForReceipt(txHash);
        if (!isMounted) {
          return;
        }

        if (result.confirmed) {
          markConfirmed();
        } else {
          markFailed(result.error || 'Transaction reverted');
        }
      } catch (err: any) {
        if (isMounted) {
          markFailed(err?.message || 'Failed to poll transaction receipt');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [txHash, waitForBalance, expectedAmountWei, address, balance, refreshBalance]);

  const openExplorer = () => {
    if (isRealTxHash) {
      Linking.openURL(getExplorerTxUrl(txHash));
    }
  };

  const counterpartyLabel =
    direction === 'received'
      ? counterpartyUsername
        ? `@${counterpartyUsername}`
        : truncateAddress(recipient)
      : truncateAddress(recipient);

  const statusTitle =
    status === 'pending'
      ? direction === 'received'
        ? 'Receiving Payment…'
        : 'Broadcasting…'
      : status === 'confirmed'
      ? direction === 'received'
        ? 'Payment Received!'
        : 'Payment Confirmed!'
      : 'Transaction Failed';

  const statusHint =
    status === 'pending'
      ? direction === 'received'
        ? 'Waiting for sender to complete the on-chain transfer'
        : 'Waiting for Monad confirmation (~1–2s)'
      : status === 'confirmed'
      ? 'Settled on Monad Testnet'
      : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'pending' && (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.statusText}>{statusTitle}</Text>
            <Text style={styles.hint}>{statusHint}</Text>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <Animated.View
              style={[styles.checkmarkCircle, {transform: [{scale: checkmarkScale}]}]}>
              <CheckGlyph size={36} color={colors.text} />
            </Animated.View>
            <Text style={styles.statusText}>{statusTitle}</Text>
            <Text style={styles.hint}>{statusHint}</Text>
          </>
        )}

        {status === 'failed' && (
          <>
            <View style={styles.failCircle}>
              <CrossIcon size={32} color={colors.text} />
            </View>
            <Text style={styles.statusText}>{statusTitle}</Text>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          </>
        )}

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{amount} MON</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {direction === 'received' ? 'From' : 'To'}
            </Text>
            <Text style={styles.detailValue}>{counterpartyLabel}</Text>
          </View>
          {isRealTxHash && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tx Hash</Text>
              <Text style={[styles.detailValue, styles.mono]}>
                {truncateAddress(txHash, 10, 8)}
              </Text>
            </View>
          )}
        </View>

        {isRealTxHash && (
          <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
            <Text style={styles.explorerText}>View on Monadscan ↗</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={buttons.primary}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.85}>
          <Text style={buttons.primaryText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  checkmarkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  failCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 28,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  explorerButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    marginBottom: 12,
  },
  explorerText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
});
