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
import {triggerHaptic} from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendPayment'>;
};

type PayMode = 'username' | 'address';

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

  const switchMode = (newMode: PayMode) => {
    triggerHaptic.selection();
    setMode(newMode);
    setResolvedAddress(null);
    setResolvedUsername(null);
    setUsernameInput('');
    setAddressInput('');
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
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 12, paddingBottom: 120},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Send Payment</Text>
          <Text style={styles.pageSubtitle}>Direct transfer on Monad testnet</Text>
        </View>

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

            {/* Quick Amount Chips (Binance Pay style) */}
            <View style={styles.presetsRow}>
              {['0.1', '0.5', '1', '5'].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    amount === val && styles.presetChipActive,
                  ]}
                  onPress={() => {
                    triggerHaptic.impactMedium();
                    setAmount(val);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.presetChipText,
                      amount === val && styles.presetChipTextActive,
                    ]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.presetChip, styles.maxChip]}
                onPress={() => {
                  triggerHaptic.impactMedium();
                  const balStr = ethers.formatEther(balance);
                  const balNum = parseFloat(balStr);
                  // Leave small headroom for gas
                  const maxSend = Math.max(0, balNum - 0.005).toFixed(4);
                  setAmount(maxSend > '0' ? maxSend : '0');
                }}
                activeOpacity={0.7}>
                <Text style={styles.maxChipText}>MAX</Text>
              </TouchableOpacity>
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
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222232',
    marginBottom: 4,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#262638',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recipientAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recipientMeta: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recipientAddr: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#30D158',
    letterSpacing: 0.5,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#14141E',
    borderRadius: 16,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#222232',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  amountCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  presetChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  presetChipText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  maxChip: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.25)',
  },
  maxChipText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  infoPill: {
    flex: 1,
    backgroundColor: '#14141E',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#222232',
  },
  infoLabel: {
    fontSize: 10,
    color: '#71717A',
    marginBottom: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sendButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
