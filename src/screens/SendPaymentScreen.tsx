/**
 * SendPaymentScreen — Unified payment screen with @username and address modes
 * After recipient is resolved, amount entry matches NFC sender Cash App-style keypad.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ethers} from 'ethers';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {resolveUsername} from '../services/registry';
import {validateAmount, validateUsername, validateAddress} from '../utils/validation';
import {truncateAddress, formatMon} from '../utils/format';
import {
  checkSufficientBalance,
  estimateGasCost,
  sendPayment,
  BalanceCheckResult,
} from '../services/wallet';
import {recordTransaction} from '../services/history';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import {CrossIcon} from '../components/AppIcons';
import {triggerHaptic} from '../utils/haptics';
import {colors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendPayment'>;
};

type PayMode = 'username' | 'address';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

export default function SendPaymentScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {address, balance, refreshBalance} = useWallet();
  const [mode, setMode] = useState<PayMode>('username');

  // Recipient state
  const [usernameInput, setUsernameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Amount state
  const [amount, setAmount] = useState('');
  const [estimatedGasWei, setEstimatedGasWei] = useState<bigint | null>(null);
  const [sending, setSending] = useState(false);

  // Modals
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [insufficientModalVisible, setInsufficientModalVisible] = useState(false);
  const [balanceCheckData, setBalanceCheckData] = useState<BalanceCheckResult | null>(null);

  useEffect(() => {
    navigation.setOptions({headerShown: !resolvedAddress});
  }, [navigation, resolvedAddress]);

  const switchMode = (newMode: PayMode) => {
    triggerHaptic.selection();
    setMode(newMode);
    setResolvedAddress(null);
    setResolvedUsername(null);
    setUsernameInput('');
    setAddressInput('');
    setAmount('');
  };

  const clearResolved = () => {
    setResolvedAddress(null);
    setResolvedUsername(null);
    setAmount('');
    setEstimatedGasWei(null);
  };

  // Search username on registry
  const handleSearchUsername = async () => {
    const trimmed = usernameInput.trim().toLowerCase();
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      triggerHaptic.notificationError();
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    triggerHaptic.impactMedium();
    setSearching(true);
    try {
      const resolved = await resolveUsername(trimmed);
      setSearching(false);

      if (!resolved) {
        triggerHaptic.notificationError();
        Alert.alert('Not Found', `@${trimmed} is not registered on Monad.`);
        return;
      }
      triggerHaptic.notificationSuccess();
      setResolvedAddress(resolved);
      setResolvedUsername(trimmed);
      setAmount('');
    } catch (err: any) {
      setSearching(false);
      triggerHaptic.notificationError();
      Alert.alert('Lookup Failed', err?.message || 'Could not query username registry.');
    }
  };

  // Validate address input
  const handleValidateAddress = () => {
    const trimmed = addressInput.trim();
    if (!validateAddress(trimmed)) {
      triggerHaptic.notificationError();
      Alert.alert('Invalid Address', 'Please enter a valid Ethereum address (0x...).');
      return;
    }
    if (trimmed.toLowerCase() === address?.toLowerCase()) {
      triggerHaptic.notificationError();
      Alert.alert('Invalid Recipient', 'You cannot send to your own address.');
      return;
    }
    triggerHaptic.notificationSuccess();
    setResolvedAddress(trimmed);
    setResolvedUsername(null);
    setAmount('');
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

      const parts = prev.split('.');
      if (parts[1] && parts[1].length >= 6) {
        return prev;
      }

      if (prev === '0' && key !== '.') {
        return key;
      }

      if (prev.length >= 12) {
        return prev;
      }

      return prev + key;
    });
  };

  // Dynamic gas estimation (with mounted guard to discard stale async results)
  useEffect(() => {
    const val = validateAmount(amount);
    if (!val.valid || !address || !resolvedAddress) {
      setEstimatedGasWei(null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const amountWei = ethers.parseEther(amount);
        const gasInfo = await estimateGasCost(address, resolvedAddress, amountWei);
        if (gasInfo && !cancelled) {
          setEstimatedGasWei(gasInfo.gasCostWei);
        }
      } catch {
        // Silent
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amount, address, resolvedAddress]);

  // Pre-check balance and show confirm modal
  const handleInitiateSend = async () => {
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      Alert.alert('Invalid Amount', amountValidation.error);
      return;
    }
    if (!address || !resolvedAddress) {
      return;
    }

    setSending(true);
    try {
      const amountWei = ethers.parseEther(amount);
      const check = await checkSufficientBalance(address, resolvedAddress, amountWei);
      if (!check.canAfford) {
        setBalanceCheckData(check);
        setInsufficientModalVisible(true);
        return;
      }
      setBalanceCheckData(check);
      setConfirmModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to verify transaction readiness.');
    } finally {
      setSending(false);
    }
  };

  // Confirm and broadcast
  const handleConfirmSend = async () => {
    if (!resolvedAddress || !balanceCheckData) {
      return;
    }

    setSending(true);
    try {
      const result = await sendPayment(resolvedAddress, balanceCheckData.amountWei);
      setSending(false);
      setConfirmModalVisible(false);

      if (result.txHash) {
        refreshBalance();
        recordTransaction({
          direction: 'sent',
          counterparty: resolvedAddress,
          counterpartyUsername: resolvedUsername || undefined,
          amount,
          status: 'pending',
          txHash: result.txHash,
        });

        navigation.navigate('TransactionStatus', {
          txHash: result.txHash,
          amount,
          recipient: resolvedAddress,
          counterpartyUsername: resolvedUsername || undefined,
        });
      } else {
        Alert.alert('Payment Failed', result.error || 'Transaction could not be broadcast.');
      }
    } catch (err: any) {
      setSending(false);
      setConfirmModalVisible(false);
      Alert.alert('Transaction Error', err?.message || 'An error occurred during payment.');
    }
  };

  const recipientDisplay = resolvedUsername
    ? `@${resolvedUsername}`
    : truncateAddress(resolvedAddress || '', 6, 4);

  const displayAmount = amount === '' ? '0' : amount;
  const canPay = validateAmount(amount).valid && !sending;

  // Cash App-style amount entry (same pattern as NFC SendTap)
  if (resolvedAddress) {
    return (
      <View
        style={[
          styles.payRoot,
          {paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12},
        ]}>
        <View style={styles.payHeader}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={clearResolved}
            activeOpacity={0.8}>
            <CrossIcon size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.payHeaderCenter}>
            <Text style={styles.payHeaderTitle}>{recipientDisplay}</Text>
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
          <Text style={styles.addrHint}>
            {truncateAddress(resolvedAddress, 8, 6)}
          </Text>
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
          onPress={handleInitiateSend}
          disabled={!canPay}
          activeOpacity={0.85}>
          {sending ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.payButtonText}>Pay</Text>
          )}
        </TouchableOpacity>

        {balanceCheckData && (
          <ConfirmPaymentModal
            visible={confirmModalVisible}
            onConfirm={handleConfirmSend}
            onCancel={() => setConfirmModalVisible(false)}
            recipient={resolvedAddress || ''}
            recipientUsername={resolvedUsername}
            amountWei={balanceCheckData.amountWei}
            gasCostWei={balanceCheckData.gasCostWei}
            loading={sending}
          />
        )}
        {balanceCheckData && (
          <InsufficientBalanceModal
            visible={insufficientModalVisible}
            onClose={() => setInsufficientModalVisible(false)}
            requiredWei={balanceCheckData.requiredTotal}
            currentBalanceWei={balanceCheckData.balance}
            userAddress={address || ''}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 12, paddingBottom: 120},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.pageTitle}>Send Payment</Text>
          <Text style={styles.pageSubtitle}>Direct transfer on Monad testnet</Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'username' && styles.modeTabActive]}
            onPress={() => switchMode('username')}
            activeOpacity={0.7}>
            <Text style={[styles.modeTabText, mode === 'username' && styles.modeTabTextActive]}>
              @Username
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'address' && styles.modeTabActive]}
            onPress={() => switchMode('address')}
            activeOpacity={0.7}>
            <Text style={[styles.modeTabText, mode === 'address' && styles.modeTabTextActive]}>
              Address
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>RECIPIENT</Text>
        {mode === 'username' ? (
          <View style={styles.inputRow}>
            <View style={styles.inputPrefix}>
              <Text style={styles.inputPrefixText}>@</Text>
            </View>
            <TextInput
              style={styles.recipientInput}
              placeholder="Enter username"
              placeholderTextColor="#4A4A66"
              value={usernameInput}
              onChangeText={(text) => {
                setUsernameInput(text);
                setResolvedAddress(null);
                setResolvedUsername(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearchUsername}
              disabled={searching}
              activeOpacity={0.7}>
              {searching ? (
                <ActivityIndicator color="#836EF9" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <View style={styles.inputPrefix}>
              <Text style={styles.inputPrefixText}>0x</Text>
            </View>
            <TextInput
              style={styles.recipientInput}
              placeholder="Enter wallet address"
              placeholderTextColor="#4A4A66"
              value={addressInput}
              onChangeText={(text) => {
                setAddressInput(text);
                setResolvedAddress(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleValidateAddress}
              disabled={searching}
              activeOpacity={0.7}>
              <Text style={styles.searchBtnText}>Verify</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#14141E',
    borderRadius: 14,
    padding: 3,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222232',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modeTabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222232',
    marginBottom: 16,
  },
  inputPrefix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#222232',
  },
  inputPrefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recipientInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: '#1F1F2C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D3E',
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
  addrHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#636366',
    fontFamily: 'monospace',
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
});
