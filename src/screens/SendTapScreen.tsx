/**
 * SendTapScreen — Enter amount, pre-check balance & gas, arm HCE, show "Hold phones together"
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
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
} from '../services/wallet';
import {startHceSession, stopHceSession} from '../services/hce';
import {encodePaymentOffer} from '../utils/apdu';
import {signMessage} from '../services/wallet';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendTap'>;
};

// Fallback recipient address for gas estimation pre-check
const DUMMY_RECIPIENT = '0x000000000000000000000000000000000000dEaD';

export default function SendTapScreen({navigation}: Props) {
  const {address, balance} = useWallet();
  const [amount, setAmount] = useState('');
  const [isArmed, setIsArmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimatedGasWei, setEstimatedGasWei] = useState<bigint | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);

  // Insufficient Balance Modal State
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceCheckData, setBalanceCheckData] = useState<BalanceCheckResult | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up HCE session on screen unmount
  useEffect(() => {
    return () => {
      stopHceSession();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Real-time gas estimation when amount changes
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
        // Silently ignore gas preview errors
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [amount, address]);

  // Handle Arming the HCE Payload
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

    setLoading(true);

    try {
      const amountWei = ethers.parseEther(amount);

      // 1. Mandatory Pre-Flight Balance Check
      const check = await checkSufficientBalance(address, DUMMY_RECIPIENT, amountWei);
      if (!check.canAfford) {
        setLoading(false);
        setBalanceCheckData(check);
        setBalanceModalVisible(true);
        return;
      }

      // 2. Generate unique session ID (UUID v4)
      const sessionIdHex = ethers.hexlify(ethers.randomBytes(16)).replace('0x', '');
      const sessionId = `${sessionIdHex.slice(0, 8)}-${sessionIdHex.slice(8, 12)}-4${sessionIdHex.slice(13, 16)}-8${sessionIdHex.slice(17, 20)}-${sessionIdHex.slice(20, 32)}`;

      // 3. Create ECDSA signature over the payload intent
      const payloadHash = ethers.keccak256(
        ethers.solidityPacked(
          ['uint8', 'uint256', 'address', 'string'],
          [0x01, amountWei, address, sessionId],
        ),
      );
      const signature = (await signMessage(ethers.getBytes(payloadHash))) || '0x' + '00'.repeat(65);

      // 4. Binary APDU encoding (134-byte PAYMENT_OFFER)
      const encodedPayload = encodePaymentOffer({
        amountWei,
        senderAddress: address,
        sessionId,
        signature,
      });

      // 5. Start HCE session with 120s auto-expiry
      const started = await startHceSession(encodedPayload);
      if (!started) {
        setLoading(false);
        Alert.alert('NFC Unavailable', 'Failed to start NFC card emulation. Please ensure NFC is enabled in Android settings.');
        return;
      }

      // 6. Enter armed state with countdown
      setIsArmed(true);
      setTimeLeft(120);

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }

      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleCancel();
            Alert.alert('Session Expired', 'Tap session timed out after 120 seconds. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      Alert.alert('Setup Error', err?.message || 'Failed to prepare payment tap.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    await stopHceSession();
    setIsArmed(false);
  };

  if (isArmed) {
    return (
      <View style={styles.container}>
        <View style={styles.tapContainer}>
          <View style={styles.pulseCircle}>
            <Text style={styles.pulseIcon}>📡</Text>
          </View>
          <Text style={styles.tapTitle}>Hold Phones Together</Text>
          <Text style={styles.tapSubtitle}>
            Sending {amount} MON{'\n'}Waiting for receiver's phone to tap...
          </Text>

          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>Auto-expires in {timeLeft}s</Text>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel Tap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Amount (MON)</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#444"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus
        />

        {/* Live Gas Fee Estimate */}
        {estimatedGasWei !== null && (
          <Text style={styles.gasHint}>
            ⚡ Est. Gas: ~{formatMon(estimatedGasWei)} (Monad)
          </Text>
        )}

        <Text style={styles.balanceHint}>
          Available Balance: {formatMon(balance)}
        </Text>

        <TouchableOpacity
          style={[styles.sendButton, loading && {opacity: 0.6}]}
          onPress={handleArm}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>Ready to Tap</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Insufficient Balance Modal */}
      {balanceCheckData && (
        <InsufficientBalanceModal
          visible={balanceModalVisible}
          onClose={() => setBalanceModalVisible(false)}
          requiredWei={balanceCheckData.requiredTotal}
          currentBalanceWei={balanceCheckData.balance}
          userAddress={address || ''}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  content: {flex: 1, justifyContent: 'center', paddingHorizontal: 24},
  label: {fontSize: 14, color: '#8888AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1},
  amountInput: {fontSize: 48, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, paddingVertical: 12},
  gasHint: {fontSize: 13, color: '#7C5CFC', textAlign: 'center', marginBottom: 6, fontWeight: '600'},
  balanceHint: {fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 36},
  sendButton: {backgroundColor: '#7C5CFC', paddingVertical: 18, borderRadius: 16, alignItems: 'center'},
  sendButtonText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF'},
  tapContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  pulseCircle: {width: 160, height: 160, borderRadius: 80, backgroundColor: '#1A1A3E', justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 2, borderColor: '#7C5CFC'},
  pulseIcon: {fontSize: 64},
  tapTitle: {fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 12},
  tapSubtitle: {fontSize: 16, color: '#8888AA', textAlign: 'center', lineHeight: 24},
  timerBadge: {marginTop: 24, paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#1E1E2C', borderRadius: 20, borderWidth: 1, borderColor: '#33334A'},
  timerText: {fontSize: 13, color: '#A0A0CC', fontWeight: '600'},
  cancelButton: {marginTop: 32, paddingVertical: 12, paddingHorizontal: 32},
  cancelText: {fontSize: 16, color: '#FF6B6B'},
});
