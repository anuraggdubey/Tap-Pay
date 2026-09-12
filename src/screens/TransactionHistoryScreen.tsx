/**
 * TransactionHistoryScreen — Scrollable list of past payments with pull-to-refresh
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  getTransactionHistory,
  subscribeHistory,
  TransactionRecord,
} from '../services/history';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionHistory'>;
};

export default function TransactionHistoryScreen({navigation}: Props) {
  const [history, setHistory] = useState<TransactionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(() => {
    setHistory(getTransactionHistory());
  }, []);

  useEffect(() => {
    loadHistory();
    const unsubscribe = subscribeHistory(() => {
      loadHistory();
    });
    return () => unsubscribe();
  }, [loadHistory]);

  const onRefresh = async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    // Simulate brief network refresh
    setTimeout(() => {
      loadHistory();
      setRefreshing(false);
    }, 600);
  };

  const renderItem = ({item}: {item: TransactionRecord}) => {
    const isSent = item.direction === 'sent';
    const isConfirmed = item.status === 'confirmed';
    const isPending = item.status === 'pending';

    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() => {
          triggerHaptic.impactMedium();
          navigation.navigate('TransactionStatus', {
            txHash: item.txHash,
            amount: item.amount,
            recipient: item.counterparty,
          });
        }}>
        <View style={styles.txLeft}>
          <View
            style={[
              styles.directionBadge,
              {backgroundColor: isSent ? '#FF444420' : '#00C85320'},
            ]}>
            <Text
              style={[
                styles.txDirection,
                {color: isSent ? '#FF6B6B' : '#4CAF50'},
              ]}>
              {isSent ? '↑' : '↓'}
            </Text>
          </View>

          <View>
            <Text style={styles.txName}>
              {item.counterpartyUsername
                ? `@${item.counterpartyUsername}`
                : truncateAddress(item.counterparty)}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.txTime}>{item.timestamp}</Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isConfirmed
                      ? '#4CAF5020'
                      : isPending
                      ? '#FFA00020'
                      : '#FF525220',
                  },
                ]}>
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: isConfirmed
                        ? '#4CAF50'
                        : isPending
                        ? '#FFA000'
                        : '#FF5252',
                    },
                  ]}>
                  {isConfirmed ? 'Confirmed' : isPending ? 'Pending' : 'Failed'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.txAmount,
            {color: isSent ? '#FF6B6B' : '#4CAF50'},
          ]}>
          {isSent ? '-' : '+'}
          {item.amount} MON
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No Transactions Yet</Text>
          <Text style={styles.emptyHint}>
            Payments sent or received will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7C5CFC"
              colors={['#7C5CFC']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  list: {
    padding: 16,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151522',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222235',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directionBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDirection: {
    fontSize: 20,
    fontWeight: '700',
  },
  txName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txTime: {
    fontSize: 12,
    color: '#8888AA',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#8888AA',
    textAlign: 'center',
  },
});
