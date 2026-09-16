/**
 * SendTapScreen — NFC contactless send flow
 * Enter amount → sign → arm HCE → detect tap → receive accept → broadcast on-chain
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ethers} from 'ethers';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateAmount} from '../utils/validation';
import {formatMon} from '../utils/format';
import {
  checkSufficientBalance,
  estimateGasCost,
  BalanceCheckResult,
  signMessage,
} from '../services/wallet';
import {isNfcSupported, isNfcEnabled, openNfcSettings} from '../services/nfcReader';
import {computePayloadHash} from '../utils/apdu';
import {APDU_VERSION} from '../config/monad';
import {
  armSenderTap,
  buildPaymentOffer,
  cancelTapSession,
  completeSenderTap,
  createSessionId,
  ArmedTapSession,
  TapSenderPhase,
} from '../services/tapPayment';
import {recordTransaction} from '../services/history';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import NfcNotAvailableModal from '../components/NfcNotAvailableModal';
import {PulsingRadar} from '../components/PulsingRadar';
import {triggerHaptic} from '../utils/haptics';
import {buttons, colors, screen} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendTap'>;
};

const DUMMY_RECIPIENT = '0x000000000000000000000000000000000000dEaD';

const PHASE_COPY: Record<TapSenderPhase, {title: string; subtitle: string}> = {
  idle: {title: '', subtitle: ''},
  armed: {
    title: 'Hold Phones Together',
    subtitle: 'Bring your phone close to the receiver.\nYour payment offer is broadcasting via NFC.',
  },
  offer_read: {
    title: 'Payment Detected',
    subtitle: 'Receiver found your offer.\nWaiting for them to accept…',
  },
  waiting_accept: {
    title: 'Waiting for Acceptance',
    subtitle: 'Ask the receiver to tap Accept, then hold phones together again.',
  },
  broadcasting: {
    title: 'Sending Payment',
    subtitle: 'Broadcasting transaction to Monad testnet…',
  },
  completed: {
    title: 'Payment Sent',
    subtitle: 'Transaction submitted successfully.',
  },
  failed: {
    title: 'Payment Failed',
    subtitle: 'The tap session could not be completed.',
  },
};

export default function SendTapScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
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
  const sessionRef = useRef<ArmedTapSession | null>(null);
  const isMountedRef = useRef(true);

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
    sessionRef.current = null;
    setPhase('idle');
    setActiveAmount('');
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

      const sessionId = createSessionId();
      const payloadHash = computePayloadHash(APDU_VERSION, amountWei, address, sessionId);
      const signature = await signMessage(
        ethers.getBytes(payloadHash),
        'Confirm Biometrics to Authorize TapPay Payment',
      );

      if (!signature) {
        return;
      }

      const {offer, encodedPayload} = buildPaymentOffer(
        APDU_VERSION,
        amountWei,
        address,
        sessionId,
        signature,
      );

      const armed = await armSenderTap(encodedPayload);
      if (!armed) {
        Alert.alert(
          'NFC Unavailable',
          'Failed to start NFC card emulation. Please ensure NFC is enabled.',
        );
        return;
      }

      const session: ArmedTapSession = {
        sessionId,
        amountWei,
        amountDisplay: amount,
        encodedPayload,
        offer,
      };
      sessionRef.current = session;
      setActiveAmount(amount);
      setPhase('armed');
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

      completeSenderTap(session, nextPhase => {
        if (isMountedRef.current) {
          setPhase(nextPhase);
        }
      }).then(async result => {
        if (!isMountedRef.current) {
          return;
        }

        clearCountdown();
        const displayAmount = session.amountDisplay;

        if (result.txHash && result.receiverAddress) {
          triggerHaptic.notificationSuccess();
          refreshBalance();
          recordTransaction({
            direction: 'sent',
            counterparty: result.receiverAddress,
            amount: displayAmount,
            status: 'pending',
            txHash: result.txHash,
          });

          navigation.replace('TransactionStatus', {
            txHash: result.txHash,
            amount: displayAmount,
            recipient: result.receiverAddress,
            direction: 'sent',
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
    const copy = PHASE_COPY[phase];
    const isWaiting = ['armed', 'offer_read', 'waiting_accept'].includes(phase);
    const isBusy = phase === 'broadcasting';

    return (
      <View style={screen.container}>
        <View style={screen.centered}>
          <PulsingRadar
            label="SEND"
            color={colors.accentSoft}
            size={96}
            active={isWaiting}
          />

          <Text style={styles.tapTitle}>{copy.title}</Text>
          <Text style={screen.subtitle}>{copy.subtitle}</Text>

          {activeAmount && (
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeLabel}>Sending</Text>
              <Text style={styles.amountBadgeValue}>{activeAmount} MON</Text>
            </View>
          )}

          {isWaiting && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>Auto-expires in {timeLeft}s</Text>
            </View>
          )}

          {isBusy && <ActivityIndicator color={colors.accent} style={{marginTop: 20}} />}

          {!isBusy && (
            <TouchableOpacity style={buttons.ghostDanger} onPress={handleCancel}>
              <Text style={buttons.ghostDangerText}>Cancel Tap</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={screen.container}>
      <View style={styles.content}>
        <Text style={screen.sectionLabel}>Amount (MON)</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#444"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus
        />

        {estimatedGasWei !== null && (
          <Text style={styles.gasHint}>Est. Gas: ~{formatMon(estimatedGasWei)}</Text>
        )}

        <Text style={styles.balanceHint}>Available: {formatMon(balance)}</Text>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>How Tap Pay works</Text>
          <Text style={styles.stepItem}>1. Enter amount and tap Ready</Text>
          <Text style={styles.stepItem}>2. Hold phones together — receiver scans</Text>
          <Text style={styles.stepItem}>3. Receiver accepts — tap again to confirm</Text>
          <Text style={styles.stepItem}>4. Payment broadcasts on Monad</Text>
        </View>

        <TouchableOpacity
          style={[buttons.primary, loading && buttons.disabled]}
          onPress={handleArm}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={buttons.primaryText}>Ready to Tap</Text>
          )}
        </TouchableOpacity>
      </View>

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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingVertical: 10,
  },
  gasHint: {
    fontSize: 12,
    color: colors.accentSoft,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
  },
  balanceHint: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    marginBottom: 24,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  stepItem: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 2,
  },
  tapTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  amountBadge: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  amountBadgeLabel: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  amountBadgeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  timerBadge: {
    marginTop: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
