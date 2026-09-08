/**
 * HomeScreen — Dashboard with balance, wallet address, and action buttons
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {truncateAddress, formatMon} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wallet Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Balance</Text>
        <Text style={styles.balanceText}>{formatMon(balance)}</Text>
        <Text style={styles.addressText}>
          {address ? truncateAddress(address) : '...'}
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshBalance}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <Text style={styles.sectionTitle}>Tap Pay</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#7C5CFC'}]}
          onPress={() => navigation.navigate('SendTap')}>
          <Text style={styles.actionIcon}>↑</Text>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}
          onPress={() => navigation.navigate('ReceiveTap')}>
          <Text style={styles.actionIcon}>↓</Text>
          <Text style={styles.actionText}>Receive</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Username Pay</Text>
      <TouchableOpacity
        style={styles.usernamePayButton}
        onPress={() => navigation.navigate('UsernamePay')}>
        <Text style={styles.usernamePayIcon}>@</Text>
        <Text style={styles.usernamePayText}>Pay by Username</Text>
      </TouchableOpacity>

      {/* Quick Links */}
      <View style={styles.linksRow}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('TransactionHistory')}>
          <Text style={styles.linkText}>📋 History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.linkText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 28,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  cardLabel: {
    fontSize: 14,
    color: '#8888AA',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#7C5CFC',
    fontFamily: 'monospace',
  },
  refreshButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  refreshText: {
    fontSize: 13,
    color: '#8888AA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usernamePayButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  usernamePayIcon: {
    fontSize: 24,
    color: '#7C5CFC',
    marginRight: 12,
    fontWeight: '700',
  },
  usernamePayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  linkButton: {
    padding: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#8888AA',
  },
});
