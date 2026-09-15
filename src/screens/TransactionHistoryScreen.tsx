/**
 * TransactionHistoryScreen — Dedicated history page with filter tabs
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
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  getTransactionHistory,
  subscribeHistory,
  initHistory,
  TransactionRecord,
} from '../services/history';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress, formatTimestamp} from '../utils/format';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterTab = 'all' | 'sent' | 'received';

export default function TransactionHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [history, setHistory] = useState<TransactionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

  const loadHistory = useCallback(() => {
    const all = getTransactionHistory();
    setHistory(all);
  }, []);

  useEffect(() => {
    initHistory().then(() => loadHistory());
    const unsubscribe = subscribeHistory(() => loadHistory());
    return () => unsubscribe();
  }, [loadHistory]);

  const onRefresh = async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    setTimeout(() => {
      loadHistory();
      setRefreshing(false);
    }, 400);
  };

  const filteredHistory = history.filter(tx => {
    if (filter === 'sent') { return tx.direction === 'sent'; }
    if (filter === 'received') { return tx.direction === 'received'; }
    return true;
  });

  const sentCount = history.filter(tx => tx.direction === 'sent').length;
  const receivedCount = history.filter(tx => tx.direction === 'received').length;

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
              {backgroundColor: isSent ? '#FF444412' : '#10B98112'},
            ]}>
            <Text
              style={[
                styles.txDirectionIcon,
                {color: isSent ? '#FF6B6B' : '#10B981'},
              ]}>
              {isSent ? '↑' : '↓'}
            </Text>
          </View>

          <View style={styles.txMeta}>
            <Text style={styles.txName}>
              {item.counterpartyUsername
                ? `@${item.counterpartyUsername}`
                : truncateAddress(item.counterparty)}
            </Text>
            <View style={styles.txSubRow}>
              <Text style={styles.txTime}>{formatTimestamp(item.timestamp)}</Text>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isConfirmed
                      ? '#10B981'
                      : isPending
                      ? '#F59E0B'
                      : '#EF4444',
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isConfirmed
                      ? '#10B981'
                      : isPending
                      ? '#F59E0B'
                      : '#EF4444',
                  },
                ]}>
                {isConfirmed ? 'Confirmed' : isPending ? 'Pending' : 'Failed'}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.txAmount,
            {color: isSent ? '#FF6B6B' : '#10B981'},
          ]}>
          {isSent ? '-' : '+'}
          {item.amount} MON
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'sent', 'received'] as FilterTab[]).map(tab => {
          const count = tab === 'all' ? history.length : tab === 'sent' ? sentCount : receivedCount;
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => {
                triggerHaptic.impactMedium();
                setFilter(tab);
              }}
              activeOpacity={0.7}>
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              <Text style={[styles.filterCount, isActive && styles.filterCountActive]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Transaction List */}
      {filteredHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIconText}>—</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {filter === 'all'
              ? 'No Transactions Yet'
              : filter === 'sent'
              ? 'No Sent Transactions'
              : 'No Received Transactions'}
          </Text>
          <Text style={styles.emptyHint}>
            {filter === 'all'
              ? 'Your payment history will appear here'
              : `Transactions you've ${filter} will appear here`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6E54FF"
              colors={['#6E54FF']}
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
    backgroundColor: '#09090D',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#15151E',
    borderWidth: 1,
    borderColor: '#242433',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#1E1E2D',
    borderColor: '#6E54FF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterTabTextActive: {
    color: '#6E54FF',
  },
  filterCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    backgroundColor: '#101018',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  filterCountActive: {
    color: '#6E54FF',
    backgroundColor: 'rgba(110, 84, 255, 0.15)',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#15151E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242433',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directionBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDirectionIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  txMeta: {
    flex: 1,
  },
  txName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#15151E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#242433',
  },
  emptyIconText: {
    fontSize: 22,
    color: '#71717A',
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
