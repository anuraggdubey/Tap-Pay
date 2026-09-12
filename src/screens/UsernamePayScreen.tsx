/**
 * UsernamePayScreen — Search username, resolve to address, pre-check balance & gas,
 * confirm with Apple Pay-style sheet, and broadcast to Monad testnet.
 */

import React, {useState, useCallback, useEffect} from 'react';
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
import {resolveUsername} from '../services/registry';
import {validateAmount, validateUsername} from '../utils/validation';
import {truncateAddress, formatMon} from '../utils/format';
import {
  checkSufficientBalance,
  estimateGasCost,
  sendPayment,
  BalanceCheckResult,
} from '../services/wallet';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UsernamePay'>;
};

export default function UsernamePayScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const [username, setUsername] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [estimatedGasWei, setEstimatedGasWei] = useState<bigint | null>(null);

  // Modals
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [insufficientModalVisible, setInsufficientModalVisible] = useState(false);
  const [balanceCheckData, setBalanceCheckData] = useState<BalanceCheckResult | null>(null);

  // Debounced username resolution reset
  const handleUsernameChange = useCallback((text: string) => {
    setUsername(text);
    setResolvedAddress(null);
    setEstimatedGasWei(null);
  }, []);

  // Search username on chain
  const handleSearch = async () => {
    const validation = validateUsername(username);
    if (!validation.valid) {
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    setSearching(true);
    try {
      const addr = await resolveUsername(username.trim().toLowerCase());
      if (addr && addr !== ethers.ZeroAddress) {
        setResolvedAddress(addr);
      } else {
        Alert.alert('Not Found', `Username @${username} is not registered on Monad testnet.`);
      }
    } catch (err: any) {
      Alert.alert('Lookup Failed', err?.message || 'Could not query username registry.');
    } finally {
      setSearching(false);
    }
  };

  // Dynamic gas estimation when amount or resolved address changes
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
        // Silently ignore gas estimate previews
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [amount, address, resolvedAddress]);

  // Initiate send flow -> pre-check balance -> show Confirm Modal
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

      // Pre-check balance before opening confirmation
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

  // Final confirmation: sign and broadcast to Monad testnet
  const handleConfirmSend = async () => {
    if (!resolvedAddress || !balanceCheckData) {
      return;
    }

    setSending(true);
    try {
      const result = await sendPayment(
        resolvedAddress,
        balanceCheckData.amountWei,
      );

      setSending(false);
      setConfirmModalVisible(false);

      if (result.txHash) {
        // Refresh balance in background
        refreshBalance();

        // Navigate to status screen with real live transaction hash
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Username Search */}
        <Text style={styles.label}>Username</Text>
        <View style={styles.searchRow}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="username"
            placeholderTextColor="#444"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={searching}>
            {searching ? (
              <ActivityIndicator color="#7C5CFC" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Resolved User Card */}
        {resolvedAddress && (
          <View style={styles.resolvedCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.resolvedMeta}>
              <Text style={styles.resolvedName}>@{username}</Text>
              <Text style={styles.resolvedAddr}>
                {truncateAddress(resolvedAddress)}
              </Text>
            </View>
            <View style={styles.resolvedBadge}>
              <Text style={styles.resolvedBadgeText}>Verified</Text>
            </View>
          </View>
        )}

        {/* Amount Input */}
        {resolvedAddress && (
          <>
            <Text style={[styles.label, {marginTop: 24}]}>Amount (MON)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#444"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Real-time Gas Display */}
            {estimatedGasWei !== null && (
              <Text style={styles.gasHint}>
                ⚡ Est. Gas: ~{formatMon(estimatedGasWei)} (Monad)
              </Text>
            )}

            <Text style={styles.balanceHint}>
              Available: {formatMon(balance)}
            </Text>

            <TouchableOpacity
              style={[styles.sendButton, sending && {opacity: 0.6}]}
              onPress={handleInitiateSend}
              disabled={sending}>
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Send to @{username}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Confirmation Modal */}
      {balanceCheckData && (
        <ConfirmPaymentModal
          visible={confirmModalVisible}
          onConfirm={handleConfirmSend}
          onCancel={() => setConfirmModalVisible(false)}
          recipient={resolvedAddress || ''}
          recipientUsername={username}
          amountWei={balanceCheckData.amountWei}
          gasCostWei={balanceCheckData.gasCostWei}
          loading={sending}
        />
      )}

      {/* Insufficient Balance Modal */}
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

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  content: {flex: 1, justifyContent: 'center', paddingHorizontal: 24},
  label: {fontSize: 14, color: '#8888AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1},
  searchRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#14141E', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#262636', marginBottom: 16},
  atSign: {fontSize: 20, fontWeight: '700', color: '#7C5CFC', marginRight: 6},
  searchInput: {flex: 1, fontSize: 18, color: '#FFFFFF', paddingVertical: 14},
  searchButton: {backgroundColor: '#1E1E2C', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#33334A'},
  searchButtonText: {fontSize: 14, fontWeight: '700', color: '#7C5CFC'},
  resolvedCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#161622', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2E2E44'},
  avatarCircle: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C5CFC', justifyContent: 'center', alignItems: 'center', marginRight: 14},
  avatarLetter: {fontSize: 20, fontWeight: '800', color: '#FFFFFF'},
  resolvedMeta: {flex: 1},
  resolvedName: {fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2},
  resolvedAddr: {fontSize: 12, color: '#8888AA', fontFamily: 'monospace'},
  resolvedBadge: {backgroundColor: 'rgba(76, 175, 80, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8},
  resolvedBadgeText: {fontSize: 12, fontWeight: '700', color: '#4CAF50'},
  amountInput: {fontSize: 48, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, paddingVertical: 12},
  gasHint: {fontSize: 13, color: '#7C5CFC', textAlign: 'center', marginBottom: 6, fontWeight: '600'},
  balanceHint: {fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 36},
  sendButton: {backgroundColor: '#7C5CFC', paddingVertical: 18, borderRadius: 16, alignItems: 'center'},
  sendButtonText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF'},
});
