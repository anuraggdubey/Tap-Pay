/**
 * TransactionHistoryScreen — Dedicated activity feed with clean filter pills
 * Cohesive with Apple Card / Opal dark aesthetic.
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
    if (filter === 'sent') return tx.direction === 'sent';
    if (filter === 'received') return tx.direction === 'received';
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
          triggerHaptic.selection();
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
              isSent ? styles.badgeSent : styles.badgeReceived,
            ]}>
            <Text style={styles.directionGlyph}>{isSent ? '↑' : '↓'}</Text>
          </View>

          <View style={styles.txMeta}>
            <Text style={styles.txName}>
              {item.counterpartyUsername
                ? `@${item.counterpartyUsername}`
                : truncateAddress(item.counterparty, 6, 4)}
            </Text>
            <View style={styles.txSubRow}>
              <Text style={styles.txTime}>{formatTimestamp(item.timestamp)}</Text>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isConfirmed
                      ? '#30D158'
                      : isPending
                      ? '#FF9F0A'
                      : '#FF453A',
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isConfirmed
                      ? '#30D158'
                      : isPending
                      ? '#FF9F0A'
                      : '#FF453A',
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
            isSent ? styles.amountSent : styles.amountReceived,
          ]}>
          {isSent ? '-' : '+'}
          {item.amount} MON
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top + 12}]}>
      {/* Clean Header Title */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Transactions</Text>
        <Text style={styles.pageSubtitle}>Activity on Monad testnet</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'sent', 'received'] as FilterTab[]).map(tab => {
          const count =
            tab === 'all'
              ? history.length
              : tab === 'sent'
              ? sentCount
              : receivedCount;
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => {
                triggerHaptic.selection();
                setFilter(tab);
              }}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              <Text
                style={[
                  styles.filterCount,
                  isActive && styles.filterCountActive,
                ]}>
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
              ? 'Your payment activity will appear here'
              : `Transactions you have ${filter} will appear here`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, {paddingBottom: 120}]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={['#FFFFFF']}
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 14,
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterTabTextActive: {
    color: '#000000',
  },
  filterCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterCountActive: {
    color: '#000000',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  list: {
    paddingHorizontal: 20,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#14141E',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222232',
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
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSent: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  badgeReceived: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  directionGlyph: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  txMeta: {
    flex: 1,
  },
  txName: {
    fontSize: 15,
    fontWeight: '700',
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
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountSent: {
    color: '#FFFFFF',
  },
  amountReceived: {
    color: '#30D158',
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
    borderRadius: 16,
    backgroundColor: '#14141E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222232',
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
