/**
 * SendPaymentScreen — Unified payment screen with @username and address modes
 * Binance Pay-style: search recipient, enter amount, confirm & broadcast
 */

import React, {useState, useEffect, useCallback} from 'react';
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
import {triggerHaptic} from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendPayment'>;
};

type PayMode = 'username' | 'address';

export default function SendPaymentScreen({navigation}: Props) {
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

  // Reset recipient when switching modes
  const switchMode = (newMode: PayMode) => {
    triggerHaptic.impactMedium();
    setMode(newMode);
    setResolvedAddress(null);
    setResolvedUsername(null);
    setUsernameInput('');
    setAddressInput('');
    setAmount('');
    setEstimatedGasWei(null);
  };

  // Search username on-chain
  const handleSearchUsername = async () => {
    const trimmed = usernameInput.trim().toLowerCase();
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    setSearching(true);
    try {
      const addr = await resolveUsername(trimmed);
      if (addr && addr !== ethers.ZeroAddress) {
        triggerHaptic.notificationSuccess();
        setResolvedAddress(addr);
        setResolvedUsername(trimmed);
      } else {
        triggerHaptic.notificationError();
        Alert.alert('Not Found', `@${trimmed} is not registered on Monad.`);
      }
    } catch (err: any) {
      triggerHaptic.notificationError();
      Alert.alert('Lookup Failed', err?.message || 'Could not query username registry.');
    } finally {
      setSearching(false);
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
  };

  // Dynamic gas estimation
  useEffect(() => {
    const val = validateAmount(amount);
    if (!val.valid || !address || !resolvedAddress) {
      setEstimatedGasWei(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const amountWei = ethers.parseEther(amount);
        const gasInfo = await estimateGasCost(address, resolvedAddress, amountWei);
        if (gasInfo) {
          setEstimatedGasWei(gasInfo.gasCostWei);
        }
      } catch {
        // Silent
      }
    }, 400);

    return () => clearTimeout(timer);
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

  const recipientDisplay = resolvedUsername ? `@${resolvedUsername}` : truncateAddress(resolvedAddress || '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* Mode Toggle */}
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

        {/* Recipient Input */}
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

        {/* Resolved Recipient Card */}
        {resolvedAddress && (
          <View style={styles.recipientCard}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarText}>
                {(resolvedUsername || resolvedAddress.slice(2, 3)).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.recipientMeta}>
              {resolvedUsername && (
                <Text style={styles.recipientName}>@{resolvedUsername}</Text>
              )}
              <Text style={styles.recipientAddr}>
                {truncateAddress(resolvedAddress, 8, 6)}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        )}

        {/* Amount Input */}
        {resolvedAddress && (
          <>
            <Text style={[styles.sectionLabel, {marginTop: 28}]}>AMOUNT</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#333344"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.amountCurrency}>MON</Text>
            </View>

            {/* Gas & Balance Info */}
            <View style={styles.infoRow}>
              {estimatedGasWei !== null && (
                <View style={styles.infoPill}>
                  <Text style={styles.infoLabel}>Gas Fee</Text>
                  <Text style={styles.infoValue}>~{formatMon(estimatedGasWei)}</Text>
                </View>
              )}
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Available</Text>
                <Text style={styles.infoValue}>{formatMon(balance)}</Text>
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, sending && {opacity: 0.6}]}
              onPress={handleInitiateSend}
              disabled={sending}
              activeOpacity={0.8}>
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Send to {recipientDisplay}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Modals */}
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#131320',
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#836EF9',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B88',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6B88',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131320',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E1E30',
    marginBottom: 16,
  },
  inputPrefix: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#1E1E30',
  },
  inputPrefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#836EF9',
  },
  recipientInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  searchBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#1E1E30',
    borderRadius: 10,
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#836EF9',
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131320',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242438',
    marginBottom: 4,
  },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#836EF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recipientAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recipientMeta: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recipientAddr: {
    fontSize: 12,
    color: '#6B6B88',
    fontFamily: 'monospace',
  },
  verifiedBadge: {
    backgroundColor: '#10B98118',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  amountCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B88',
    letterSpacing: 1,
    marginTop: -4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  infoPill: {
    flex: 1,
    backgroundColor: '#131320',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B6B88',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#836EF9',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
