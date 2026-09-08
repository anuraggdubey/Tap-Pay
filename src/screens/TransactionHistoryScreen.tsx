/**
 * TransactionHistoryScreen — Scrollable list of past payments
 */

import React from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionHistory'>;
};

// Placeholder type — will be populated from backend /session/history/:address
interface TransactionItem {
  id: string;
  direction: 'sent' | 'received';
  counterparty: string;
  counterpartyUsername?: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'failed';
  txHash: string;
  timestamp: string;
}

// Placeholder data — remove when wired to backend
const PLACEHOLDER_DATA: TransactionItem[] = [];

export default function TransactionHistoryScreen({navigation}: Props) {
  const renderItem = ({item}: {item: TransactionItem}) => (
    <TouchableOpacity
      style={styles.txRow}
      onPress={() =>
        navigation.navigate('TransactionStatus', {
          txHash: item.txHash,
          amount: item.amount,
          recipient: item.counterparty,
        })
      }>
      <View style={styles.txLeft}>
        <Text style={styles.txDirection}>
          {item.direction === 'sent' ? '↑' : '↓'}
        </Text>
        <View>
          <Text style={styles.txName}>
            {item.counterpartyUsername
              ? `@${item.counterpartyUsername}`
              : `${item.counterparty.substring(0, 8)}...`}
          </Text>
          <Text style={styles.txTime}>{item.timestamp}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.txAmount,
          {color: item.direction === 'sent' ? '#FF6B6B' : '#4CAF50'},
        ]}>
        {item.direction === 'sent' ? '-' : '+'}
        {item.amount} MON
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {PLACEHOLDER_DATA.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptyHint}>
            Your payment history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={PLACEHOLDER_DATA}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  list: {padding: 16},
  txRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, marginBottom: 8},
  txLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  txDirection: {fontSize: 20, color: '#FFFFFF'},
  txName: {fontSize: 15, fontWeight: '600', color: '#FFFFFF'},
  txTime: {fontSize: 12, color: '#666', marginTop: 2},
  txAmount: {fontSize: 15, fontWeight: '700'},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8},
  emptyHint: {fontSize: 14, color: '#8888AA'},
});
