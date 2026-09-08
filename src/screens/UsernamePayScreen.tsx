/**
 * UsernamePayScreen — Search username, resolve to address, enter amount, send
 */

import React, {useState, useCallback} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {resolveUsername} from '../services/registry';
import {validateAmount, validateUsername} from '../utils/validation';
import {truncateAddress, formatMon} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UsernamePay'>;
};

export default function UsernamePayScreen({navigation}: Props) {
  const {balance} = useWallet();
  const [username, setUsername] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Debounced username resolution
  const handleUsernameChange = useCallback((text: string) => {
    setUsername(text);
    setResolvedAddress(null);
  }, []);

  const handleSearch = async () => {
    const validation = validateUsername(username);
    if (!validation.valid) {
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    setSearching(true);
    const address = await resolveUsername(username);
    setSearching(false);

    if (address) {
      setResolvedAddress(address);
    } else {
      Alert.alert('Not Found', `Username @${username} is not registered.`);
    }
  };

  const handleSend = async () => {
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      Alert.alert('Invalid Amount', amountValidation.error);
      return;
    }

    if (!resolvedAddress) {
      return;
    }

    setSending(true);
    // TODO: Call wallet.sendPayment() with resolvedAddress and amount
    // TODO: Navigate to TransactionStatus
    setSending(false);

    navigation.navigate('TransactionStatus', {
      txHash: '0x...pending',
      amount,
      recipient: resolvedAddress,
    });
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

        {/* Resolved User */}
        {resolvedAddress && (
          <View style={styles.resolvedCard}>
            <Text style={styles.resolvedName}>@{username}</Text>
            <Text style={styles.resolvedAddr}>
              {truncateAddress(resolvedAddress)}
            </Text>
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
            <Text style={styles.balanceHint}>
              Available: {formatMon(balance)}
            </Text>

            <TouchableOpacity
              style={[styles.sendButton, sending && {opacity: 0.6}]}
              onPress={handleSend}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  content: {flex: 1, paddingHorizontal: 24, paddingTop: 24},
  label: {fontSize: 14, color: '#8888AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1},
  searchRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  atSign: {fontSize: 20, color: '#7C5CFC', fontWeight: '700', marginRight: 8},
  searchInput: {flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, fontSize: 16, color: '#FFFFFF', borderWidth: 1, borderColor: '#2A2A3E'},
  searchButton: {marginLeft: 12, backgroundColor: '#1A1A2E', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#7C5CFC'},
  searchButtonText: {fontSize: 14, color: '#7C5CFC', fontWeight: '600'},
  resolvedCard: {backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50'},
  resolvedName: {fontSize: 16, fontWeight: '700', color: '#4CAF50'},
  resolvedAddr: {fontSize: 14, color: '#8888AA', fontFamily: 'monospace'},
  amountInput: {fontSize: 36, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', paddingVertical: 16, marginBottom: 8},
  balanceHint: {fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32},
  sendButton: {backgroundColor: '#7C5CFC', paddingVertical: 18, borderRadius: 16, alignItems: 'center'},
  sendButtonText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF'},
});
