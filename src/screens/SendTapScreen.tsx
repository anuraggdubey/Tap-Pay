/**
 * SendTapScreen — NFC contactless send flow (One-Way Architecture)
 * Amount entry UI inspired by Cash App keypad (dark theme).
 */

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ethers} from 'ethers';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateAmount} from '../utils/validation';
import {formatMon, truncateAddress} from '../utils/format';
import {
  checkSufficientBalance,
  estimateGasCost,
  BalanceCheckResult,
} from '../services/wallet';
import {isNfcSupported, isNfcEnabled, openNfcSettings} from '../services/nfcReader';
import {
  cancelTapSession,
  readTapRecipient,
  broadcastTapPayment,
  TapRecipient,
  TapSenderPhase,
} from '../services/tapPayment';
import {recordTransaction} from '../services/history';
import {SUPPORTED_TOKENS} from '../config/tokens';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import NfcWaitingCard from '../components/NfcWaitingCard';
import {CrossIcon} from '../components/AppIcons';
import {triggerHaptic} from '../utils/haptics';
import AmbientBackground from '../components/AmbientBackground';
import type {AppColors} from '../theme';
import PressableScale from '../components/PressableScale';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendTap'>;
};

const DUMMY_RECIPIENT = '0x000000000000000000000000000000000000dEaD';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

export default function SendTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const {colors, isDark} = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<TapSenderPhase>('idle');
  const [loading, setLoading] = useState(false);
  const [estimatedGasWei, setEstimatedGasWei] = useState<bigint | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [activeAmount, setActiveAmount] = useState('');

  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceCheckData, setBalanceCheckData] = useState<BalanceCheckResult | null>(null);
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  // Recipient read over NFC, awaiting the user's explicit confirmation before any signing.
  const [pendingRecipient, setPendingRecipient] = useState<TapRecipient | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    navigation.setOptions({headerShown: false});
  }, [navigation]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelTapSession();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const val = validateAmount(amount);
    if (!val.valid || !address) {
      setEstimatedGasWei(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const amountWei = ethers.parseEther(amount);
        const gasInfo = await estimateGasCost(address, DUMMY_RECIPIENT, amountWei);
        if (gasInfo) {
          setEstimatedGasWei(gasInfo.gasCostWei);
        }
      } catch {
        // Ignore gas preview errors
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [amount, address]);

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleCancel = async () => {
    clearCountdown();
    await cancelTapSession();
    setConfirmVisible(false);
    setConfirming(false);
    setPendingRecipient(null);
    setScanHint(null);
    setPhase('idle');
    setActiveAmount('');
  };

  // Step 2: user confirmed the on-screen recipient — now sign and broadcast.
  const handleConfirmSend = async () => {
    if (!pendingRecipient || !address) {
      return;
    }
    const recipient = pendingRecipient;
    const effectiveToken = (recipient.requestedToken || 'MON').toUpperCase();
    const tokenInfo = SUPPORTED_TOKENS[effectiveToken];
    const decimals = tokenInfo?.decimals ?? 18;
    const rawAmount = recipient.requestedAmount || activeAmount || amount;
    let amountWei: bigint;
    try {
      amountWei = ethers.parseUnits(rawAmount, decimals);
    } catch {
      Alert.alert('Invalid Amount', 'Could not read the payment amount.');
      await handleCancel();
      return;
    }

    const paymentAmount = ethers.formatUnits(amountWei, decimals);
    setConfirming(true);
    setPhase('broadcasting');
    triggerHaptic.impactMedium();

    const result =
      effectiveToken === 'MON'
        ? recipient.sessionNonce
          ? await broadcastTapPayment(
              recipient.receiverAddress,
              amountWei,
              recipient.sessionNonce,
            )
          : await broadcastTapPayment(recipient.receiverAddress, amountWei)
        : await broadcastTapPayment(
            recipient.receiverAddress,
            amountWei,
            effectiveToken,
            paymentAmount,
            recipient.sessionNonce,
          );

    clearCountdown();
    if (isMountedRef.current) {
      setConfirming(false);
      setConfirmVisible(false);

      if (!result.txHash) {
        triggerHaptic.notificationError();
        setPhase('failed');
        Alert.alert(
          'Payment Failed',
          result.error || 'Could not broadcast the payment.',
          [{text: 'OK', onPress: () => handleCancel()}],
        );
        return;
      }

      triggerHaptic.notificationSuccess();
      refreshBalance();
      setPendingRecipient(null);
    }

    if (!result.txHash) {
      return;
    }

    recordTransaction({
      walletAddress: address,
      direction: 'sent',
      counterparty: recipient.receiverAddress,
      counterpartyUsername: recipient.receiverUsername,
      amount: paymentAmount,
      tokenSymbol: effectiveToken,
      status: 'pending',
      txHash: result.txHash,
    });

    if (!isMountedRef.current) {
      return;
    }
    navigation.replace('TransactionStatus', {
      txHash: result.txHash,
      amount: paymentAmount,
      recipient: recipient.receiverAddress,
      direction: 'sent',
      counterpartyUsername: recipient.receiverUsername,
      tokenSymbol: effectiveToken,
    });
  };

  const onKeyPress = (key: string) => {
    if (key === '⌫') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }

    setAmount(prev => {
      if (key === '.') {
        if (prev.includes('.')) {
          return prev;
        }
        return prev === '' ? '0.' : prev + '.';
      }

      // Limit decimal places to 6 for keypad comfort
      const parts = prev.split('.');
      if (parts[1] && parts[1].length >= 6) {
        return prev;
      }

      // Avoid leading zeros like 00
      if (prev === '0' && key !== '.') {
        return key;
      }

      if (prev.length >= 12) {
        return prev;
      }

      return prev + key;
    });
  };

  const handleArm = async () => {
    const validation = validateAmount(amount);
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.error);
      return;
    }

    if (!address) {
      Alert.alert('Error', 'No wallet found. Please initialize your wallet.');
      return;
    }

    const nfcSupported = await isNfcSupported();
    if (!nfcSupported) {
      setNfcModalVisible(true);
      return;
    }

    const nfcEnabled = await isNfcEnabled();
    if (!nfcEnabled) {
      Alert.alert(
        'NFC Disabled',
        'NFC is turned off. Please enable NFC to use Tap Pay.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => openNfcSettings()},
        ],
      );
      return;
    }

    setLoading(true);

    try {
      const amountWei = ethers.parseEther(amount);
      const check = await checkSufficientBalance(address, DUMMY_RECIPIENT, amountWei);
      if (check.limitError) {
        Alert.alert('Invalid Amount', check.limitError);
        return;
      }
      if (!check.canAfford) {
        setBalanceCheckData(check);
        setBalanceModalVisible(true);
        return;
      }

      setActiveAmount(amount);
      setScanHint(null);
      setPhase('reading');
      setTimeLeft(120);
      triggerHaptic.impactMedium();

      clearCountdown();
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleCancel();
            triggerHaptic.notificationError();
            Alert.alert('Session Expired', 'Tap session timed out. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Step 1: read the recipient. This does NOT sign or broadcast anything.
      readTapRecipient(address, hint => {
        if (isMountedRef.current) {
          setScanHint(hint);
        }
      }).then(result => {
        if (!isMountedRef.current) {
          return;
        }

        if (!result.recipient) {
          triggerHaptic.notificationError();
          setPhase('failed');
          Alert.alert(
            'Tap Failed',
            result.error || 'Could not read the other device.',
            [{text: 'OK', onPress: () => handleCancel()}],
          );
          return;
        }

        // Step 2: show the recipient and wait for explicit confirmation before signing.
        triggerHaptic.notificationSuccess();
        setScanHint(null);
        setPendingRecipient(result.recipient);
        setPhase('confirming');
        setConfirmVisible(true);
      });
    } catch (err: any) {
      triggerHaptic.notificationError();
      Alert.alert('Setup Error', err?.message || 'Failed to prepare payment tap.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanRequest = async () => {
    if (!address) {
      return;
    }

    const supported = await isNfcSupported();
    if (!supported) {
      setNfcModalVisible(true);
      return;
    }

    const enabled = await isNfcEnabled();
    if (!enabled) {
      Alert.alert(
        'NFC Disabled',
        'Please enable NFC in your device settings to tap and pay.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => openNfcSettings()},
        ],
      );
      return;
    }

    setActiveAmount('');
    setScanHint(null);
    setPhase('reading');
    setTimeLeft(120);
    triggerHaptic.impactMedium();

    clearCountdown();
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleCancel();
          triggerHaptic.notificationError();
          Alert.alert('Session Expired', 'Tap session timed out. Please try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    readTapRecipient(address, hint => {
      if (isMountedRef.current) {
        setScanHint(hint);
      }
    }).then(result => {
      if (!isMountedRef.current) {
        return;
      }

      setScanHint(null);
      if (!result.recipient) {
        triggerHaptic.notificationError();
        setPhase('failed');
        Alert.alert(
          'Tap Failed',
          result.error || 'Could not read the other device.',
          [{text: 'OK', onPress: () => handleCancel()}],
        );
        return;
      }

      if (!result.recipient.requestedAmount) {
        triggerHaptic.notificationError();
        setPhase('failed');
        Alert.alert(
          'Amount Required',
          'The other phone did not specify a payment amount. Enter an amount and tap Pay.',
          [{text: 'OK', onPress: () => handleCancel()}],
        );
        return;
      }

      triggerHaptic.notificationSuccess();
      setPendingRecipient(result.recipient);
      setPhase('confirming');
      setConfirmVisible(true);
    });
  };

  if (phase !== 'idle') {
    const isBusy = phase === 'broadcasting';
    const isCompleted = phase === 'completed';

    // Map TapSenderPhase to NfcWaitingCard visual phase
    let visualPhase: 'searching' | 'broadcasting' | 'success' | 'failed';
    if (phase === 'reading' || phase === 'confirming') {
      visualPhase = 'searching';
    } else if (phase === 'broadcasting') {
      visualPhase = 'broadcasting';
    } else if (phase === 'completed') {
      visualPhase = 'success';
    } else {
      visualPhase = 'failed';
    }

    const gasDisplay = estimatedGasWei
      ? formatMon(estimatedGasWei).replace(/ MON$/, '')
      : '0.0004';

    const confirmToken = (pendingRecipient?.requestedToken || 'MON').toUpperCase();
    const confirmDecimals = SUPPORTED_TOKENS[confirmToken]?.decimals ?? 18;
    const confirmDisplayAmount =
      pendingRecipient?.requestedAmount || activeAmount || amount || '0';
    let confirmAmountWei = 0n;
    try {
      confirmAmountWei = ethers.parseUnits(confirmDisplayAmount, confirmDecimals);
    } catch {
      confirmAmountWei = 0n;
    }

    return (
      <>
        <NfcWaitingCard
          accent="blue"
          phase={visualPhase}
          direction="send"
          amount={pendingRecipient?.requestedAmount || activeAmount || amount}
          tokenSymbol={confirmToken}
          timeLeft={timeLeft}
          gasEstimate={gasDisplay}
          hint={scanHint}
          onClose={isBusy ? undefined : handleCancel}
          footer={
            !isBusy && !isCompleted ? (
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={handleCancel}
                activeOpacity={0.7}>
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            ) : null
          }
        />
        <ConfirmPaymentModal
          visible={confirmVisible && !!pendingRecipient}
          recipient={pendingRecipient?.receiverAddress ?? ''}
          recipientUsername={pendingRecipient?.receiverUsername}
          amountWei={confirmAmountWei}
          gasCostWei={estimatedGasWei ?? 0n}
          loading={confirming}
          tokenSymbol={confirmToken}
          displayAmount={
            pendingRecipient?.requestedAmount || confirmToken !== 'MON'
              ? confirmDisplayAmount
              : undefined
          }
          onConfirm={handleConfirmSend}
          onCancel={handleCancel}
        />
      </>
    );
  }

  const displayAmount = amount === '' ? '0' : amount;
  const canPay = validateAmount(amount).valid && !loading;

  return (
    <View
      style={[
        styles.payRoot,
        {paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12},
      ]}>
      <AmbientBackground />
      <View style={styles.payHeader}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <CrossIcon size={16} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.payHeaderCenter}>
          <Text style={styles.payHeaderTitle}>
            {address ? truncateAddress(address, 6, 4) : 'Tap Pay'}
          </Text>
          <Text style={styles.payHeaderBalance}>
            {formatMon(balance).replace(/ MON$/, '')} MON available
          </Text>
        </View>

        <View style={styles.closeBtnSpacer} />
      </View>

      <View style={styles.amountStage}>
        <Text style={styles.bigAmount} numberOfLines={1} adjustsFontSizeToFit>
          {displayAmount}
        </Text>
        <View style={styles.currencyRow}>
          <Text style={styles.currencyText}>MON</Text>
          {estimatedGasWei !== null && validateAmount(amount).valid && (
            <Text style={styles.gasHint}>
              Gas ~{formatMon(estimatedGasWei).replace(/ MON$/, '')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.keypad}>
        {KEYS.map(row => (
          <View key={row.join('-')} style={styles.keypadRow}>
            {row.map(key => (
              <PressableScale
                key={key}
                style={styles.key}
                contentStyle={styles.keyInner}
                onPress={() => onKeyPress(key)}
                scaleTo={0.92}>
                <Text style={styles.keyText}>{key}</Text>
              </PressableScale>
            ))}
          </View>
        ))}
      </View>

      <PressableScale
        style={[styles.payButton, !canPay && styles.payButtonDisabled]}
        contentStyle={styles.payButtonInner}
        onPress={handleArm}
        disabled={!canPay}>
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.payButtonText}>Pay</Text>
        )}
      </PressableScale>

      <TouchableOpacity
        style={styles.scanRequestBtn}
        onPress={handleScanRequest}
        disabled={loading}
        activeOpacity={0.7}>
        <Text style={styles.scanRequestBtnText}>Scan Payment Request</Text>
      </TouchableOpacity>

      {balanceCheckData && (
        <InsufficientBalanceModal
          visible={balanceModalVisible}
          onClose={() => setBalanceModalVisible(false)}
          requiredWei={balanceCheckData.requiredTotal}
          currentBalanceWei={balanceCheckData.balance}
          userAddress={address || ''}
        />
      )}

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

function createStyles(colors: AppColors, isDark: boolean) {
  const rim = isDark ? 'rgba(255,255,255,0.18)' : colors.border;
  return StyleSheet.create({
  payRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : colors.surfaceSolid,
    borderWidth: 1,
    borderColor: rim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnSpacer: {
    width: 36,
  },
  payHeaderCenter: {
    alignItems: 'center',
    flex: 1,
  },
  payHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  payHeaderBalance: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  amountStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  bigAmount: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1.5,
    maxWidth: '100%',
  },
  currencyRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  gasHint: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: '500',
  },
  keypad: {
    paddingBottom: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    width: '33.33%',
  },
  keyInner: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 30,
    fontWeight: '400',
    color: colors.text,
  },
  payButton: {
    backgroundColor: colors.text,
    borderRadius: 28,
    marginTop: 8,
    overflow: 'hidden',
  },
  payButtonInner: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.35,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.background,
  },
  cancelLink: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelLinkText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.accent,
  },
  scanRequestBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  scanRequestBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  });
}
