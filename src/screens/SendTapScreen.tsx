/**
 * SendTapScreen — NFC contactless send flow (One-Way Architecture)
 * Amount entry UI inspired by Cash App keypad (dark theme).
 */

import React, {useState, useEffect, useRef} from 'react';
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
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateAmount} from '../utils/validation';
import {formatMon, truncateAddress} from '../utils/format';
import {
  checkSufficientBalance,
  estimateGasCost,
  BalanceCheckResult,
} from '../services/wallet';
import {reverseResolveAddress} from '../services/registry';
import {isNfcSupported, isNfcEnabled, openNfcSettings} from '../services/nfcReader';
import {
  cancelTapSession,
  completeSenderTap,
  TapSenderPhase,
} from '../services/tapPayment';
import {recordTransaction} from '../services/history';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import NfcWaitingCard from '../components/NfcWaitingCard';
import {CrossIcon} from '../components/AppIcons';
import {triggerHaptic} from '../utils/haptics';
import {colors} from '../theme';

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

const PHASE_COPY: Record<TapSenderPhase, {title: string; subtitle: string}> = {
  idle: {title: '', subtitle: ''},
  reading: {
    title: 'Hold phones together',
    subtitle: 'Keep backs touching until the address is read.',
  },
  broadcasting: {
    title: 'Sending payment',
    subtitle: 'Broadcasting to Monad testnet…',
  },
  completed: {
    title: 'Payment sent',
    subtitle: 'Transaction submitted successfully.',
  },
  failed: {
    title: 'Payment failed',
    subtitle: 'The tap session could not be completed.',
  },
};

export default function SendTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
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
    setPhase('idle');
    setActiveAmount('');
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
      if (!check.canAfford) {
        setBalanceCheckData(check);
        setBalanceModalVisible(true);
        return;
      }

      setActiveAmount(amount);
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

      completeSenderTap(address, amountWei, nextPhase => {
        if (isMountedRef.current) {
          setPhase(nextPhase);
        }
      }).then(async result => {
        if (!isMountedRef.current) {
          return;
        }

        clearCountdown();

        if (result.txHash && result.receiverAddress) {
          triggerHaptic.notificationSuccess();
          refreshBalance();

          let receiverUsername: string | undefined;
          try {
            receiverUsername =
              (await reverseResolveAddress(result.receiverAddress)) ||
              undefined;
          } catch {
            // Optional
          }

          recordTransaction({
            direction: 'sent',
            counterparty: result.receiverAddress,
            counterpartyUsername: receiverUsername,
            amount: amount,
            status: 'pending',
            txHash: result.txHash,
          });

          navigation.replace('TransactionStatus', {
            txHash: result.txHash,
            amount: amount,
            recipient: result.receiverAddress,
            direction: 'sent',
            counterpartyUsername: receiverUsername,
          });
          return;
        }

        triggerHaptic.notificationError();
        setPhase('failed');
        Alert.alert(
          'Tap Payment Failed',
          result.error || 'Could not complete the NFC payment.',
          [{text: 'OK', onPress: () => handleCancel()}],
        );
      });
    } catch (err: any) {
      triggerHaptic.notificationError();
      Alert.alert('Setup Error', err?.message || 'Failed to prepare payment tap.');
    } finally {
      setLoading(false);
    }
  };

  if (phase !== 'idle') {
    const isBusy = phase === 'broadcasting';
    const isCompleted = phase === 'completed';

    // Map TapSenderPhase to NfcWaitingCard visual phase
    let visualPhase: 'searching' | 'broadcasting' | 'success' | 'failed';
    if (phase === 'reading') {
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

    return (
      <NfcWaitingCard
        accent="purple"
        phase={visualPhase}
        direction="send"
        amount={activeAmount || amount}
        timeLeft={timeLeft}
        gasEstimate={gasDisplay}
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
      <View style={styles.payHeader}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <CrossIcon size={16} color="#FFFFFF" />
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
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => onKeyPress(key)}
                activeOpacity={0.55}>
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.payButton, !canPay && styles.payButtonDisabled]}
        onPress={handleArm}
        disabled={!canPay}
        activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text style={styles.payButtonText}>Pay</Text>
        )}
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

const styles = StyleSheet.create({
  payRoot: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: '#1C1C1E',
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  payHeaderBalance: {
    marginTop: 3,
    fontSize: 13,
    color: '#8E8E93',
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
    color: '#FFFFFF',
    letterSpacing: -2,
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
    fontWeight: '700',
    color: colors.successSoft,
  },
  gasHint: {
    fontSize: 12,
    color: '#636366',
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
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  payButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  payButtonDisabled: {
    opacity: 0.35,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  cancelLink: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
});
