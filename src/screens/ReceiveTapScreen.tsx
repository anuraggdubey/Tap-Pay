/**
 * ReceiveTapScreen — NFC Card Emulation mode for One-Way NFC
 * Broadcasts address and polls for incoming payments.
 */

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
  type ExpectedPaymentRequest,
} from '../services/tapPayment';
import {
  createTapSessionNonce,
  hashSessionId,
} from '../utils/paymentSession';
import {
  validateTapPaymentRequest,
  type TapPaymentRequest,
} from '../utils/apdu';
import {SUPPORTED_TOKENS} from '../config/tokens';
import {reverseResolveAddress} from '../services/registry';
import {recordTransaction} from '../services/history';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import NfcWaitingCard from '../components/NfcWaitingCard';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';
import {SESSION_TIMEOUT_MS} from '../config/monad';
import PressableScale from '../components/PressableScale';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

export default function ReceiveTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [sessionState, setSessionState] = useState<'searching' | 'expired' | 'received'>('searching');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [requestEditorOpen, setRequestEditorOpen] = useState(false);
  const [requestAmountInput, setRequestAmountInput] = useState('');
  const [requestTokenInput, setRequestTokenInput] = useState<string>('MON');
  const [activeRequest, setActiveRequest] = useState<
    (TapPaymentRequest & {amountWei: bigint}) | null
  >(null);

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
    const {start: startReceiverBroadcast, stop: stopReceiverBroadcast} = createReceiverBroadcastLease();
    isMountedRef.current = true;
    setSessionState('searching');
    const controller = new AbortController();
    let sessionTimer: ReturnType<typeof setTimeout> | undefined;
    let stopPromise: Promise<void> | undefined;
    let paymentFound = false;

    const stopSession = () => {
      controller.abort();
      if (sessionTimer !== undefined) clearTimeout(sessionTimer);
      if (!stopPromise) {
        stopPromise = stopReceiverBroadcast().catch(error => {
          console.error('Failed to stop receive session:', error);
        });
      }
      return stopPromise;
    };
    const expireSession = async () => {
      await stopSession();
      if (!cancelled && !paymentFound) setSessionState('expired');
    };

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
        const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
        const sessionNonce = createTapSessionNonce();
        const expectedSessionIdHash = hashSessionId(sessionNonce);
        sessionTimer = setTimeout(() => { expireSession(); }, SESSION_TIMEOUT_MS);
        const paymentRequest: TapPaymentRequest | undefined = activeRequest
          ? {amount: activeRequest.amount, tokenSymbol: activeRequest.tokenSymbol}
          : undefined;
        const expectedRequest: ExpectedPaymentRequest | undefined = activeRequest
          ? {amountWei: activeRequest.amountWei, tokenSymbol: activeRequest.tokenSymbol}
          : undefined;
        // Start HCE broadcasting address + per-session nonce (and optional payment request)
        const started = await startReceiverBroadcast(address, expiresAt, {
          sessionNonce,
          paymentRequest,
        });
        if (!started) {
           if (cancelled) return;
           Alert.alert('Error', 'Failed to start NFC broadcast.');
           return;
        }

        if (cancelled) {
          await stopReceiverBroadcast();
          return;
        }
        // Detection is driven by a confirmed on-chain ledger event bound to this tap session.
        if (controller.signal.aborted) {
          await stopReceiverBroadcast();
          return;
        }
        const payment = await waitForIncomingPayment(
          address,
          Math.max(0, expiresAt - Date.now()),
          controller.signal,
          {
            sessionIdHash: expectedSessionIdHash,
            paymentRequest: expectedRequest,
          },
        );

        if (payment.detected && !cancelled && !controller.signal.aborted) {
          paymentFound = true;
          setSessionState('received');
          await stopSession();

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

          if (cancelled) return;
          refreshBalanceRef.current();
          triggerHaptic.notificationSuccess();

          const counterpartyLabel = senderAddress || 'Unknown (Tap)';

          recordTransaction({
            walletAddress: address,
            direction: 'received',
            counterparty: counterpartyLabel,
            counterpartyUsername: senderUsername,
            amount: amountStr,
            tokenSymbol,
            // Pending until a quorum receipt confirms it: the status screen (waitForReceipt) or
            // reconcilePendingTransactions moves it to confirmed (#123).
            status: payment.txHash ? 'pending' : 'confirmed',
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
    })().catch(() => {
      if (!cancelled && !controller.signal.aborted) {
        Alert.alert('Receive session ended', 'Could not monitor payments. Please restart the session.');
      }
    }).finally(expireSession);

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      stopSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, sessionAttempt, activeRequest]);

  const handleApplyRequest = () => {
    const trimmed = requestAmountInput.trim();
    if (!trimmed) {
      setActiveRequest(null);
      setRequestEditorOpen(false);
      return;
    }
    const validated = validateTapPaymentRequest(trimmed, requestTokenInput);
    if (!validated) {
      Alert.alert(
        'Invalid Request',
        `Enter a valid positive ${requestTokenInput} amount.`,
      );
      return;
    }
    setActiveRequest(validated);
    setRequestEditorOpen(false);
  };

  const tokenSymbols = Object.keys(SUPPORTED_TOKENS);

  return (
    <View style={styles.root}>
      <NfcWaitingCard
        accent="blue"
        phase={sessionState}
        direction="receive"
        amount={activeRequest?.amount}
        tokenSymbol={activeRequest?.tokenSymbol}
        onClose={() => navigation.goBack()}
        footer={
          <>
            {sessionState === 'expired' && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Restart receive session"
                onPress={() => setSessionAttempt(attempt => attempt + 1)}>
                <Text style={styles.restart}>Restart receive session</Text>
              </PressableScale>
            )}
            {sessionState !== 'received' && (
              requestEditorOpen ? (
                <View style={styles.requestCard}>
                  <View style={styles.tokenRow}>
                    {tokenSymbols.map(sym => {
                      const selected = sym === requestTokenInput;
                      return (
                        <TouchableOpacity
                          key={sym}
                          style={[styles.tokenChip, selected && styles.tokenChipSelected]}
                          onPress={() => setRequestTokenInput(sym)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.tokenChipText,
                              selected && styles.tokenChipTextSelected,
                            ]}>
                            {sym}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.requestInputRow}>
                    <TextInput
                      style={styles.requestInput}
                      value={requestAmountInput}
                      onChangeText={setRequestAmountInput}
                      placeholder={`Amount (${requestTokenInput})`}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                    <TouchableOpacity
                      style={styles.applyBtn}
                      onPress={handleApplyRequest}
                      activeOpacity={0.8}>
                      <Text style={styles.applyBtnText}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.requestToggle}
                  onPress={() => setRequestEditorOpen(true)}
                  activeOpacity={0.7}>
                  <Text style={styles.requestToggleText}>
                    {activeRequest
                      ? `Requesting ${activeRequest.amount} ${activeRequest.tokenSymbol} · Edit`
                      : 'Request specific amount'}
                  </Text>
                </TouchableOpacity>
              )
            )}
            {!!address ? (
              <Text style={styles.walletHint}>
                {truncateAddress(address, 8, 6)}
              </Text>
            ) : null}
          </>
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
  restart: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    padding: 16,
  },
  requestToggle: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  requestToggleText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  requestCard: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  tokenRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  tokenChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tokenChipSelected: {
    backgroundColor: colors.accent,
  },
  tokenChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  tokenChipTextSelected: {
    color: '#FFFFFF',
  },
  requestInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  requestInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  });
}
