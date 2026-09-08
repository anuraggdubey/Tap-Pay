/**
 * SendTapScreen — Enter amount, arm HCE, show "Hold phones together"
 */

import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateAmount} from '../utils/validation';
import {formatMon} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SendTap'>;
};

export default function SendTapScreen({navigation}: Props) {
  const {balance} = useWallet();
  const [amount, setAmount] = useState('');
  const [isArmed, setIsArmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleArm = async () => {
    const validation = validateAmount(amount);
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.error);
      return;
    }

    // TODO: Pre-check balance, create session, sign payload, arm HCE
    setLoading(true);
    // Simulating session creation delay
    setTimeout(() => {
      setLoading(false);
      setIsArmed(true);
    }, 500);
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
            Sending {amount} MON{'\n'}Waiting for receiver...
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsArmed(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
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

        <Text style={styles.balanceHint}>
          Available: {formatMon(balance)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  content: {flex: 1, justifyContent: 'center', paddingHorizontal: 24},
  label: {fontSize: 14, color: '#8888AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1},
  amountInput: {fontSize: 48, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 12, paddingVertical: 20},
  balanceHint: {fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40},
  sendButton: {backgroundColor: '#7C5CFC', paddingVertical: 18, borderRadius: 16, alignItems: 'center'},
  sendButtonText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF'},
  tapContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  pulseCircle: {width: 160, height: 160, borderRadius: 80, backgroundColor: '#1A1A3E', justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 2, borderColor: '#7C5CFC'},
  pulseIcon: {fontSize: 64},
  tapTitle: {fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 12},
  tapSubtitle: {fontSize: 16, color: '#8888AA', textAlign: 'center', lineHeight: 24},
  cancelButton: {marginTop: 40, paddingVertical: 12, paddingHorizontal: 32},
  cancelText: {fontSize: 16, color: '#FF6B6B'},
});
